"use server";

import { nanoid } from "nanoid";
import { liveblocks } from "@/lib/liveblocks";
import { revalidatePath } from "next/cache";
import { getAccessType, parseStringify } from "@/lib/utils";
import { redirect } from "next/navigation";
import {
  eq,
  and,
  or,
  ne,
  lt,
  isNotNull,
  inArray,
  ilike,
  desc,
  count,
} from "drizzle-orm";
import {
  db,
  document,
  documentStar,
  documentCollaborator,
  workspaceMember,
  activityLog,
  user,
} from "@collabnow/db";
import { sendMail, documentShareEmailHtml } from "@collabnow/email";
import { encodeCursor, decodeCursor } from "@/lib/pagination";
import type {
  CreateDocumentParams,
  ShareDocumentParams,
  RoomDocument,
  GetDocumentsForUserOptions,
  PaginatedDocuments,
} from "../types";

const DOC_LIMIT = 50;
const DOCUMENTS_PAGE_SIZE = 15;
const RECENT_DOCUMENTS_LIMIT = 10;

// A document is "the user's" if they created it or were added as a collaborator.
// Shared by the doc-limit check, the count widget, and the paginated list query so
// the three can never silently drift apart on what counts as "owned".
function userDocumentAccessCondition(userId: string) {
  return or(eq(document.creatorId, userId), isNotNull(documentCollaborator.id));
}

async function countUserDocuments(userId: string): Promise<number> {
  const [{ count: total }] = await db
    .select({ count: count() })
    .from(document)
    .leftJoin(
      documentCollaborator,
      and(
        eq(documentCollaborator.documentId, document.id),
        eq(documentCollaborator.userId, userId)
      )
    )
    .where(userDocumentAccessCondition(userId));
  return total;
}

export const createDocument = async ({
  userId,
  email,
  workspaceId,
}: CreateDocumentParams) => {
  try {
    // Enforce 50-document limit (documents the user created or was added to as a collaborator)
    const existingCount = await countUserDocuments(userId);

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

// Fetches one keyset-paginated page of a user's document list, filtered by
// tab (all/recent/starred/shared/archived) and optionally by title search.
// Ordered by `(createdAt, id)` descending so pages stay stable even as new
// documents are inserted between fetches (unlike offset-based pagination).
export const getDocumentsForUser = async (
  userId: string,
  options: GetDocumentsForUserOptions = {}
): Promise<PaginatedDocuments> => {
  try {
    const filter = options.filter ?? "all";
    const search = options.search?.trim() || undefined;
    const limit =
      options.limit ?? (filter === "recent" ? RECENT_DOCUMENTS_LIMIT : DOCUMENTS_PAGE_SIZE);

    const conditions = [userDocumentAccessCondition(userId)];

    if (filter === "shared") {
      conditions.push(ne(document.creatorId, userId));
      conditions.push(eq(document.isArchived, false));
    } else if (filter === "archived") {
      conditions.push(eq(document.isArchived, true));
      conditions.push(eq(document.creatorId, userId));
    } else if (filter === "all") {
      conditions.push(eq(document.isArchived, false));
    }
    // "recent" intentionally applies no archive condition, matching the previous
    // in-memory behavior of showing the N most recently created docs regardless
    // of archive state. "starred" is narrowed further below.

    if (search) {
      conditions.push(ilike(document.title, `%${search}%`));
    }

    if (filter === "starred") {
      const starredRows = await db
        .select({ documentId: documentStar.documentId })
        .from(documentStar)
        .where(eq(documentStar.userId, userId));
      const starredDocIds = starredRows.map((r) => r.documentId);
      if (starredDocIds.length === 0) return { documents: [], nextCursor: null };
      conditions.push(inArray(document.id, starredDocIds));
    }

    const decodedCursor = decodeCursor(options.cursor);
    if (decodedCursor) {
      const cursorCreatedAt = new Date(decodedCursor.createdAt);
      conditions.push(
        or(
          lt(document.createdAt, cursorCreatedAt),
          and(
            eq(document.createdAt, cursorCreatedAt),
            lt(document.id, decodedCursor.id)
          )
        )
      );
    }

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
      .where(and(...conditions))
      .orderBy(desc(document.createdAt), desc(document.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    if (pageRows.length === 0) return { documents: [], nextCursor: null };

    const starredRows = await db
      .select({ documentId: documentStar.documentId })
      .from(documentStar)
      .where(
        and(
          eq(documentStar.userId, userId),
          inArray(
            documentStar.documentId,
            pageRows.map((r) => r.id)
          )
        )
      );
    const pageStarredSet = new Set(starredRows.map((r) => r.documentId));

    const documents: RoomDocument[] = pageRows.map((r) => ({
      id: r.roomId,
      metadata: { title: r.title, creatorId: r.creatorId },
      createdAt: r.createdAt.toISOString(),
      isStarred: filter === "starred" ? true : pageStarredSet.has(r.id),
      isArchived: r.isArchived,
    }));

    const last = pageRows[pageRows.length - 1];
    const nextCursor = hasMore
      ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
      : null;

    return { documents, nextCursor };
  } catch (error) {
    console.error(`Error getting documents: ${error}`);
    return { documents: [], nextCursor: null };
  }
};

// Lightweight total (not filtered/paginated) used for the "X / 50 documents" display.
export const getDocumentCountForUser = async (userId: string): Promise<number> => {
  try {
    return await countUserDocuments(userId);
  } catch (error) {
    console.error(`Error counting documents: ${error}`);
    return 0;
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
}: ShareDocumentParams): Promise<{ error?: string }> => {
  try {
    const [doc] = await db
      .select({ workspaceId: document.workspaceId })
      .from(document)
      .where(eq(document.roomId, roomId))
      .limit(1);
    if (!doc) return { error: "Document not found." };

    const [targetUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    if (!targetUser) {
      return {
        error: `${email} needs a Collab Now account before they can be added.`,
      };
    }

    const [membership] = await db
      .select({ id: workspaceMember.id })
      .from(workspaceMember)
      .where(
        and(
          eq(workspaceMember.workspaceId, doc.workspaceId),
          eq(workspaceMember.userId, targetUser.id)
        )
      )
      .limit(1);
    if (!membership) {
      return {
        error: `${email} isn't a member of this workspace yet. Invite them to the workspace first.`,
      };
    }

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
    return {};
  } catch (error) {
    console.error(`Error updating document access: ${error}`);
    return { error: "Something went wrong while updating access. Please try again." };
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
