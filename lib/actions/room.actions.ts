"use server";

import { nanoid } from "nanoid";
import { liveblocks } from "../liveblocks";
import { revalidatePath } from "next/cache";
import { getAccessType, parseStringify } from "../utils";
import { redirect } from "next/navigation";
import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/db";
import { document, documentStar, activityLog } from "@/db/schema/app";
import { sendMail } from "@/lib/email/send";
import { documentShareEmailHtml } from "@/lib/email/templates/document-share";

const DOC_LIMIT = 50;

export const createDocument = async ({
  userId,
  email,
  workspaceId,
}: CreateDocumentParams) => {
  try {
    // Enforce 50-document limit
    const existing = await liveblocks.getRooms({ userId: email });
    if (existing.data && existing.data.length >= DOC_LIMIT) {
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

export const getDocuments = async (email: string) => {
  try {
    const rooms = await liveblocks.getRooms({ userId: email });
    return parseStringify(rooms);
  } catch (error) {
    console.error(`Error getting rooms: ${error}`);
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

export const getStarredDocumentRoomIds = async (userId: string) => {
  try {
    const rows = await db
      .select({ roomId: document.roomId })
      .from(documentStar)
      .innerJoin(document, eq(documentStar.documentId, document.id))
      .where(eq(documentStar.userId, userId));

    return rows.map((r) => r.roomId);
  } catch (error) {
    console.error(`Error getting starred docs: ${error}`);
    return [];
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

export const getArchivedDocumentRoomIds = async (userId: string) => {
  try {
    const rows = await db
      .select({ roomId: document.roomId })
      .from(document)
      .where(
        and(eq(document.creatorId, userId), eq(document.isArchived, true))
      );

    return rows.map((r) => r.roomId);
  } catch (error) {
    console.error(`Error getting archived docs: ${error}`);
    return [];
  }
};
