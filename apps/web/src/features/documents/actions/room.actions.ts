"use server";

import { nanoid } from "nanoid";
import { liveblocks } from "@/lib/liveblocks";
import { revalidatePath } from "next/cache";
import { getAccessType, parseStringify } from "@/lib/utils";
import { redirect } from "next/navigation";
import { eq, and, or, isNotNull, inArray, desc, count } from "drizzle-orm";
import {
  db,
  document,
  documentStar,
  documentCollaborator,
  activityLog,
  user,
} from "@collabnow/db";
import { sendMail, documentShareEmailHtml } from "@collabnow/email";
import type {
  CreateDocumentParams,
  ShareDocumentParams,
  RoomDocument,
} from "../types";

const DOC_LIMIT = 50;

export const createDocument = async ({
  userId,
  email,
  workspaceId,
}: CreateDocumentParams) => {
  try {
    // Enforce 50-document limit (documents the user created or was added to as a collaborator)
    const [{ count: existingCount }] = await db
      .select({ count: count() })
      .from(document)
      .leftJoin(
        documentCollaborator,
        and(
          eq(documentCollaborator.documentId, document.id),
          eq(documentCollaborator.userId, userId)
        )
      )
      .where(
        or(eq(document.creatorId, userId), isNotNull(documentCollaborator.id))
      );

    if (existingCount >= DOC_LIMIT) {
      throw new Error(
        `Document limit reached. You can have up to ${DOC_LIMIT} documents.`
      );
    }

    const roomId = nanoid();

    const metadata = {
      creatorId: userId,
      email,
      title: "Untitled document",
    };

    const usersAccesses: RoomAccesses = {
      [email]: ["room:write"],
    };

    const room = await liveblocks.createRoom(roomId, {
      metadata,
      usersAccesses,
      defaultAccesses: [],
    });

    // Also insert into local document table
    if (workspaceId) {
      await db.insert(document).values({
        roomId,
        title: "Untitled document",
        creatorId: userId,
        workspaceId,
      });

      await db.insert(activityLog).values({
        workspaceId,
        userId,
        action: "created",
        metadata: JSON.stringify({ roomId, title: "Untitled document" }),
      });
    }

    revalidatePath("/dashboard");
    return parseStringify(room);
  } catch (error) {
    console.error(`Failed to create document: ${error}`);
    throw error;
  }
};

export const getDocument = async ({
  roomId,
  userId,
}: {
  roomId: string;
  userId: string;
}) => {
  try {
    const room = await liveblocks.getRoom(roomId);
    const hasAccess = Object.keys(room.usersAccesses).includes(userId);

    if (!hasAccess) {
      throw new Error("You do not have access to this document");
    }

    return parseStringify(room);
  } catch (error) {
    console.error(`Error getting room: ${error}`);
  }
};

export const getDocumentsForUser = async (
  userId: string
): Promise<RoomDocument[]> => {
  try {
    const rows = await db
      .select({
        id: document.id,
        roomId: document.roomId,
        title: document.title,
        creatorId: document.creatorId,
        createdAt: document.createdAt,
        isArchived: document.isArchived,
      })
      .from(document)
      .leftJoin(
        documentCollaborator,
        and(
          eq(documentCollaborator.documentId, document.id),
          eq(documentCollaborator.userId, userId)
        )
      )
      .where(
        or(eq(document.creatorId, userId), isNotNull(documentCollaborator.id))
      )
      .orderBy(desc(document.createdAt));

    if (rows.length === 0) return [];

    const starredRows = await db
      .select({ documentId: documentStar.documentId })
      .from(documentStar)
      .where(
        and(
          eq(documentStar.userId, userId),
          inArray(
            documentStar.documentId,
            rows.map((r) => r.id)
          )
        )
      );
    const starredSet = new Set(starredRows.map((r) => r.documentId));

    return rows.map((r) => ({
      id: r.roomId,
      metadata: { title: r.title, creatorId: r.creatorId },
      createdAt: r.createdAt.toISOString(),
      isStarred: starredSet.has(r.id),
      isArchived: r.isArchived,
    }));
  } catch (error) {
    console.error(`Error getting documents: ${error}`);
    return [];
  }
};

export const updateDocument = async (roomId: string, title: string) => {
  try {
    const updatedRoom = await liveblocks.updateRoom(roomId, {
      metadata: { title },
    });
    revalidatePath(`/documents/${roomId}`);
    return parseStringify(updatedRoom);
  } catch (error) {
    console.error(`Failed to update title: ${error}`);
  }
};

// Mirrors a Liveblocks access grant into `documentCollaborator` so the dashboard can
// list shared documents from Postgres without querying Liveblocks. No-ops for emails
// that aren't registered users — they have no dashboard to populate yet.
// `updatedByEmail` is resolved the same way: this app's `User.id` is frequently just
// the email (see dashboard-share-dialog.tsx), not the real Postgres user id, so it
// can't be trusted directly for the `addedBy` foreign key.
async function grantCollaboratorAccess(
  roomId: string,
  email: string,
  role: "editor" | "viewer",
  updatedByEmail: string
) {
  const [doc] = await db
    .select({ id: document.id })
    .from(document)
    .where(eq(document.roomId, roomId))
    .limit(1);
  if (!doc) return;

  const [[targetUser], [adder]] = await Promise.all([
    db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1),
    db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, updatedByEmail))
      .limit(1),
  ]);
  if (!targetUser || !adder) return;

  const [existing] = await db
    .select({ id: documentCollaborator.id })
    .from(documentCollaborator)
    .where(
      and(
        eq(documentCollaborator.documentId, doc.id),
        eq(documentCollaborator.userId, targetUser.id)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(documentCollaborator)
      .set({ role })
      .where(eq(documentCollaborator.id, existing.id));
  } else {
    await db.insert(documentCollaborator).values({
      documentId: doc.id,
      userId: targetUser.id,
      role,
      addedBy: adder.id,
    });
  }
}

// Mirrors a Liveblocks access revoke into `documentCollaborator`.
async function revokeCollaboratorAccess(roomId: string, email: string) {
  const [doc] = await db
    .select({ id: document.id })
    .from(document)
    .where(eq(document.roomId, roomId))
    .limit(1);
  if (!doc) return;

  const [targetUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (!targetUser) return;

  await db
    .delete(documentCollaborator)
    .where(
      and(
        eq(documentCollaborator.documentId, doc.id),
        eq(documentCollaborator.userId, targetUser.id)
      )
    );
}

export const updateDocumentAccess = async ({
  roomId,
  email,
  userType,
  updatedBy,
}: ShareDocumentParams) => {
  try {
    const usersAccesses: RoomAccesses = {
      [email]: getAccessType(userType) as AccessType,
    };

    const room = await liveblocks.updateRoom(roomId, { usersAccesses });

    if (room) {
      await grantCollaboratorAccess(
        roomId,
        email,
        userType === "viewer" ? "viewer" : "editor",
        updatedBy.email
      );

      const notificationId = nanoid();
      await liveblocks.triggerInboxNotification({
        userId: email,
        kind: "$documentAccess",
        subjectId: notificationId,
        activityData: {
          userType,
          title: `You have been granted ${userType} access to the document by ${updatedBy.name}`,
          updatedBy: updatedBy.name,
          avatar: updatedBy.avatar,
          email: updatedBy.email,
        },
        roomId,
      });

      const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
      const documentTitle =
        (room.metadata as { title?: string }).title || "Untitled document";

      void sendMail({
        to: email,
        subject: `${updatedBy.name} shared "${documentTitle}" with you`,
        html: documentShareEmailHtml({
          sharerName: updatedBy.name,
          documentTitle,
          accessType: userType,
          documentUrl: `${baseUrl}/documents/${roomId}`,
        }),
      });
    }

    revalidatePath(`/documents/${roomId}`);
    return parseStringify(room);
  } catch (error) {
    console.error(`Error updating document access: ${error}`);
  }
};

export const removeCollaborator = async ({
  roomId,
  email,
}: {
  roomId: string;
  email: string;
}) => {
  try {
    const room = await liveblocks.getRoom(roomId);

    if (room.metadata.email === email) {
      throw new Error("You cannot remove yourself from the document");
    }

    const updatedRoom = await liveblocks.updateRoom(roomId, {
      usersAccesses: { [email]: null },
    });

    await revokeCollaboratorAccess(roomId, email);

    revalidatePath(`/documents/${roomId}`);
    return parseStringify(updatedRoom);
  } catch (error) {
    console.error(`Error removing collaborator: ${error}`);
  }
};

export const getDocumentCollaborators = async (roomId: string) => {
  try {
    const room = await liveblocks.getRoom(roomId);
    const userIds = Object.keys(room.usersAccesses);

    const { getUsers } = await import("./user.actions");
    const users = await getUsers({ userIds });

    return parseStringify(
      users.map((u: User) => ({
        ...u,
        userType: (room.usersAccesses[u.email] as string[] | undefined)?.includes("room:write")
          ? "editor"
          : "viewer",
      }))
    );
  } catch (error) {
    console.error(`Error getting document collaborators: ${error}`);
    return [];
  }
};

export const deleteDocument = async (roomId: string) => {
  try {
    // Look up document for activity logging before deleting
    const [doc] = await db
      .select({
        workspaceId: document.workspaceId,
        creatorId: document.creatorId,
        title: document.title,
      })
      .from(document)
      .where(eq(document.roomId, roomId))
      .limit(1);

    await liveblocks.deleteRoom(roomId);
    await db.delete(document).where(eq(document.roomId, roomId));

    if (doc) {
      await db.insert(activityLog).values({
        workspaceId: doc.workspaceId,
        userId: doc.creatorId,
        action: "deleted",
        metadata: JSON.stringify({ roomId, title: doc.title }),
      });
    }
  } catch (error) {
    console.error(`Error deleting document: ${error}`);
    throw error;
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
};

// ── Starring ──────────────────────────────────────────────────

export const toggleStarDocument = async (roomId: string, userId: string) => {
  try {
    const [doc] = await db
      .select({ id: document.id, workspaceId: document.workspaceId })
      .from(document)
      .where(eq(document.roomId, roomId))
      .limit(1);

    if (!doc) throw new Error("Document not found");

    const [existing] = await db
      .select({ id: documentStar.id })
      .from(documentStar)
      .where(
        and(
          eq(documentStar.documentId, doc.id),
          eq(documentStar.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      await db.delete(documentStar).where(eq(documentStar.id, existing.id));
    } else {
      await db.insert(documentStar).values({
        documentId: doc.id,
        userId,
      });
    }

    revalidatePath("/dashboard");
    return { starred: !existing };
  } catch (error) {
    console.error(`Error toggling star: ${error}`);
    throw error;
  }
};

// ── Archiving ─────────────────────────────────────────────────

export const toggleArchiveDocument = async (roomId: string, userId: string) => {
  try {
    const [doc] = await db
      .select({
        id: document.id,
        isArchived: document.isArchived,
        workspaceId: document.workspaceId,
      })
      .from(document)
      .where(eq(document.roomId, roomId))
      .limit(1);

    if (!doc) throw new Error("Document not found");

    const newValue = !doc.isArchived;
    await db
      .update(document)
      .set({ isArchived: newValue, updatedAt: new Date() })
      .where(eq(document.id, doc.id));

    await db.insert(activityLog).values({
      workspaceId: doc.workspaceId,
      userId,
      action: newValue ? "archived" : "unarchived",
      metadata: JSON.stringify({ roomId }),
    });

    revalidatePath("/dashboard");
    return { archived: newValue };
  } catch (error) {
    console.error(`Error toggling archive: ${error}`);
    throw error;
  }
};

