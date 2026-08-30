"use server";

import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { auth } from "@/features/auth/lib";
import {
  db,
  workspace,
  workspaceMember,
  workspaceInvite,
  activityLog,
  user,
} from "@collabnow/db";
import {
  eq,
  and,
  ilike,
  or,
  gt,
  lt,
  notInArray,
  count,
  desc,
  asc,
  sql,
  type SQL,
} from "drizzle-orm";
import { updateTag, unstable_cache } from "next/cache";
import { parseStringify } from "@/lib/utils";
import { checkRateLimit, formatRetryAfter, RATE_LIMITS } from "@/lib/rate-limit";
import {
  type ActionResult,
  ActionError,
  actionError,
  safeAction,
} from "@/lib/action-result";
import { sendMail, inviteEmailHtml } from "@collabnow/email";
import { activityTag, workspaceMembersTag } from "@/lib/cache-tags";
import { encodeCursor, decodeCursor } from "@/lib/pagination";
import type {
  WorkspaceRole,
  WorkspaceData,
  WorkspaceMember,
  WorkspaceSearchResult,
  PendingInvite,
  WorkspaceInvite,
  AcceptInviteResult,
} from "../types";
import type { GetActivityOptions, PaginatedActivity } from "../../activity/types";

const ACTIVITY_PAGE_SIZE = 20;

export const getOrCreateWorkspace = async (
  userId: string,
  userName: string
): Promise<ActionResult<WorkspaceData>> =>
  safeAction(async () => {
    // A user can belong to more than one workspace (their own auto-created one, plus
    // any they've joined via invite). Deterministically prefer the one they own, then
    // fall back to whichever membership is oldest, rather than an arbitrary DB row order.
    const existing = await db
      .select({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug,
        role: workspaceMember.role,
      })
      .from(workspaceMember)
      .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
      .where(eq(workspaceMember.userId, userId))
      .orderBy(
        desc(sql`${workspaceMember.role} = 'owner'`),
        asc(workspaceMember.joinedAt)
      )
      .limit(1);

    if (existing.length > 0) {
      // Get member count
      const [memberCount] = await db
        .select({ count: count() })
        .from(workspaceMember)
        .where(eq(workspaceMember.workspaceId, existing[0].workspaceId));

      return parseStringify({
        id: existing[0].workspaceId,
        name: existing[0].workspaceName,
        slug: existing[0].workspaceSlug,
        role: existing[0].role as WorkspaceRole,
        memberCount: memberCount.count,
      });
    }

    // Create a new workspace
    const workspaceId = nanoid();
    const slug = nanoid(10);

    await db.insert(workspace).values({
      id: workspaceId,
      name: `${userName}'s Workspace`,
      slug,
      ownerId: userId,
    });

    await db.insert(workspaceMember).values({
      workspaceId,
      userId,
      role: "owner",
    });

    return parseStringify({
      id: workspaceId,
      name: `${userName}'s Workspace`,
      slug,
      role: "owner" as WorkspaceRole,
      memberCount: 1,
    });
  }, "Failed to load your workspace. Please try again.");

async function fetchWorkspaceMembers(workspaceId: string) {
  const members = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: workspaceMember.role,
      joinedAt: workspaceMember.joinedAt,
    })
    .from(workspaceMember)
    .innerJoin(user, eq(workspaceMember.userId, user.id))
    .where(eq(workspaceMember.workspaceId, workspaceId));

  return parseStringify(members);
}

export const getWorkspaceMembers = async (
  workspaceId: string
): Promise<ActionResult<WorkspaceMember[]>> =>
  safeAction(
    () =>
      unstable_cache(
        () => fetchWorkspaceMembers(workspaceId),
        ["workspace-members", workspaceId],
        { tags: [workspaceMembersTag(workspaceId)], revalidate: 60 }
      )(),
    "Failed to load workspace members. Please try again."
  );

export const searchUsers = async ({
  query,
  workspaceId,
}: {
  query: string;
  workspaceId: string;
}): Promise<ActionResult<WorkspaceSearchResult[]>> =>
  safeAction(async () => {
    // Get existing member user IDs to exclude
    const existingMembers = await db
      .select({ userId: workspaceMember.userId })
      .from(workspaceMember)
      .where(eq(workspaceMember.workspaceId, workspaceId));

    const memberIds = existingMembers.map((m) => m.userId);

    const pattern = `%${query}%`;

    let results;
    if (memberIds.length > 0) {
      results = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        })
        .from(user)
        .where(
          and(
            or(ilike(user.name, pattern), ilike(user.email, pattern)),
            notInArray(user.id, memberIds)
          )
        )
        .limit(5);
    } else {
      results = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        })
        .from(user)
        .where(or(ilike(user.name, pattern), ilike(user.email, pattern)))
        .limit(5);
    }

    return parseStringify(results);
  }, "Failed to search users. Please try again.");

export const inviteMember = async ({
  workspaceId,
  email,
  role,
  invitedById,
}: {
  workspaceId: string;
  email: string;
  role: string;
  invitedById: string;
}): Promise<ActionResult<WorkspaceInvite>> => {
  // Re-derive identity server-side rather than trusting the caller-supplied
  // `invitedById` (see docs/ROADMAP.md P0-6).
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.id !== invitedById) {
    return actionError("You must be signed in to invite members.");
  }

  const rateLimit = await checkRateLimit(
    RATE_LIMITS.workspaceInvite,
    session.user.id
  );
  if (!rateLimit.success) {
    return actionError(
      `You're sending invites too quickly. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds!)}.`,
      rateLimit.retryAfterSeconds
    );
  }

  return safeAction(async () => {
    // Check if user is already a member (by email)
    const existingUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      const existingMember = await db
        .select({ id: workspaceMember.id })
        .from(workspaceMember)
        .where(
          and(
            eq(workspaceMember.workspaceId, workspaceId),
            eq(workspaceMember.userId, existingUser[0].id)
          )
        )
        .limit(1);

      if (existingMember.length > 0) {
        throw new ActionError("User is already a member of this workspace.");
      }
    }

    // Check for pending invite
    const pendingInvite = await db
      .select({ id: workspaceInvite.id })
      .from(workspaceInvite)
      .where(
        and(
          eq(workspaceInvite.workspaceId, workspaceId),
          eq(workspaceInvite.email, email),
          eq(workspaceInvite.status, "pending")
        )
      )
      .limit(1);

    if (pendingInvite.length > 0) {
      throw new ActionError("An invite has already been sent to this email.");
    }

    // Create invite
    const token = nanoid();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [invite] = await db
      .insert(workspaceInvite)
      .values({
        workspaceId,
        email,
        role,
        token,
        invitedBy: invitedById,
        status: "pending",
        expiresAt,
      })
      .returning();

    // Get inviter info and workspace name
    const [inviter] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, invitedById));

    const [ws] = await db
      .select({ name: workspace.name })
      .from(workspace)
      .where(eq(workspace.id, workspaceId));

    // Send invite email
    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const acceptUrl = `${baseUrl}/invite/accept?token=${token}`;

    await sendMail({
      to: email,
      subject: `You're invited to join ${ws.name}`,
      html: inviteEmailHtml({
        inviterName: inviter.name,
        workspaceName: ws.name,
        role,
        acceptUrl,
      }),
    });

    // Log activity
    await db.insert(activityLog).values({
      workspaceId,
      userId: invitedById,
      action: "invited",
      metadata: JSON.stringify({ email, role }),
    });

    updateTag(activityTag(workspaceId));

    return parseStringify(invite);
  }, "Failed to send invite. Please try again.");
};

export const acceptInvite = async (
  token: string
): Promise<ActionResult<AcceptInviteResult>> =>
  safeAction(async () => {
    const now = new Date();

    // Find the invite
    const [invite] = await db
      .select()
      .from(workspaceInvite)
      .where(
        and(
          eq(workspaceInvite.token, token),
          eq(workspaceInvite.status, "pending"),
          gt(workspaceInvite.expiresAt, now)
        )
      )
      .limit(1);

    if (!invite) {
      throw new ActionError("Invite is invalid or has expired.");
    }

    // Find user by email
    const [invitedUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, invite.email))
      .limit(1);

    if (!invitedUser) {
      return { outcome: "needsSignUp", email: invite.email };
    }

    // Check if already a member (edge case: joined via another path)
    const existing = await db
      .select({ id: workspaceMember.id })
      .from(workspaceMember)
      .where(
        and(
          eq(workspaceMember.workspaceId, invite.workspaceId),
          eq(workspaceMember.userId, invitedUser.id)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(workspaceMember).values({
        workspaceId: invite.workspaceId,
        userId: invitedUser.id,
        role: invite.role,
      });
    }

    // Update invite status
    await db
      .update(workspaceInvite)
      .set({ status: "accepted" })
      .where(eq(workspaceInvite.id, invite.id));

    // Log activity
    await db.insert(activityLog).values({
      workspaceId: invite.workspaceId,
      userId: invitedUser.id,
      action: "joined",
    });

    updateTag(workspaceMembersTag(invite.workspaceId));
    updateTag(activityTag(invite.workspaceId));

    return { outcome: "joined", workspaceId: invite.workspaceId };
  }, "Failed to accept invite. Please try again.");

export const getPendingInvites = async (
  workspaceId: string
): Promise<ActionResult<PendingInvite[]>> =>
  safeAction(async () => {
    const invites = await db
      .select({
        id: workspaceInvite.id,
        email: workspaceInvite.email,
        role: workspaceInvite.role,
        createdAt: workspaceInvite.createdAt,
      })
      .from(workspaceInvite)
      .where(
        and(
          eq(workspaceInvite.workspaceId, workspaceId),
          eq(workspaceInvite.status, "pending"),
          gt(workspaceInvite.expiresAt, new Date())
        )
      );

    return parseStringify(invites);
  }, "Failed to load pending invites. Please try again.");

export const revokeInvite = async ({
  inviteId,
  workspaceId,
  revokedById,
}: {
  inviteId: string;
  workspaceId: string;
  revokedById: string;
}): Promise<ActionResult<null>> => {
  // Re-derive identity server-side rather than trusting the caller-supplied
  // `revokedById` (see docs/ROADMAP.md P0-6).
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.id !== revokedById) {
    return actionError("You must be signed in to revoke invites.");
  }

  return safeAction(async () => {
    const [actor] = await db
      .select({ role: workspaceMember.role })
      .from(workspaceMember)
      .where(
        and(
          eq(workspaceMember.workspaceId, workspaceId),
          eq(workspaceMember.userId, revokedById)
        )
      )
      .limit(1);
    if (!actor || (actor.role !== "owner" && actor.role !== "admin")) {
      throw new ActionError("You don't have permission to revoke invites.");
    }

    const [invite] = await db
      .select({
        id: workspaceInvite.id,
        email: workspaceInvite.email,
        status: workspaceInvite.status,
      })
      .from(workspaceInvite)
      .where(
        and(
          eq(workspaceInvite.id, inviteId),
          eq(workspaceInvite.workspaceId, workspaceId)
        )
      )
      .limit(1);
    if (!invite) throw new ActionError("Invite not found.");
    if (invite.status !== "pending") {
      throw new ActionError("This invite is no longer pending.");
    }

    await db
      .delete(workspaceInvite)
      .where(eq(workspaceInvite.id, inviteId));

    await db.insert(activityLog).values({
      workspaceId,
      userId: revokedById,
      action: "invite_revoked",
      metadata: JSON.stringify({ email: invite.email }),
    });

    updateTag(activityTag(workspaceId));

    return null;
  }, "Failed to revoke invite. Please try again.");
};

export const removeMember = async ({
  workspaceId,
  memberUserId,
  removedById,
}: {
  workspaceId: string;
  memberUserId: string;
  removedById: string;
}): Promise<ActionResult<null>> => {
  // Re-derive identity server-side rather than trusting the caller-supplied
  // `removedById` (see docs/ROADMAP.md P0-6).
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.id !== removedById) {
    return actionError("You must be signed in to remove members.");
  }

  return safeAction(async () => {
    if (memberUserId === removedById) {
      throw new ActionError(
        'Use "Leave workspace" to remove yourself.'
      );
    }

    const [actor] = await db
      .select({ role: workspaceMember.role })
      .from(workspaceMember)
      .where(
        and(
          eq(workspaceMember.workspaceId, workspaceId),
          eq(workspaceMember.userId, removedById)
        )
      )
      .limit(1);
    if (!actor || (actor.role !== "owner" && actor.role !== "admin")) {
      throw new ActionError("You don't have permission to remove members.");
    }

    const [target] = await db
      .select({
        id: workspaceMember.id,
        role: workspaceMember.role,
        email: user.email,
      })
      .from(workspaceMember)
      .innerJoin(user, eq(workspaceMember.userId, user.id))
      .where(
        and(
          eq(workspaceMember.workspaceId, workspaceId),
          eq(workspaceMember.userId, memberUserId)
        )
      )
      .limit(1);
    if (!target) throw new ActionError("Member not found.");
    if (target.role === "owner") {
      throw new ActionError("The workspace owner can't be removed.");
    }
    if (target.role === "admin" && actor.role !== "owner") {
      throw new ActionError("Only the workspace owner can remove an admin.");
    }

    await db.delete(workspaceMember).where(eq(workspaceMember.id, target.id));

    await db.insert(activityLog).values({
      workspaceId,
      userId: removedById,
      action: "member_removed",
      metadata: JSON.stringify({ email: target.email }),
    });

    updateTag(workspaceMembersTag(workspaceId));
    updateTag(activityTag(workspaceId));

    return null;
  }, "Failed to remove member. Please try again.");
};

export const leaveWorkspace = async ({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}): Promise<ActionResult<null>> => {
  // Re-derive identity server-side rather than trusting the caller-supplied
  // `userId` (see docs/ROADMAP.md P0-6).
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.id !== userId) {
    return actionError("You must be signed in to leave a workspace.");
  }

  return safeAction(async () => {
    const [membership] = await db
      .select({ id: workspaceMember.id, role: workspaceMember.role })
      .from(workspaceMember)
      .where(
        and(
          eq(workspaceMember.workspaceId, workspaceId),
          eq(workspaceMember.userId, userId)
        )
      )
      .limit(1);
    if (!membership) {
      throw new ActionError("You're not a member of this workspace.");
    }
    if (membership.role === "owner") {
      throw new ActionError(
        "Workspace owners can't leave. Transfer ownership or delete the workspace instead."
      );
    }

    await db
      .delete(workspaceMember)
      .where(eq(workspaceMember.id, membership.id));

    await db.insert(activityLog).values({
      workspaceId,
      userId,
      action: "left_workspace",
    });

    updateTag(workspaceMembersTag(workspaceId));
    updateTag(activityTag(workspaceId));

    return null;
  }, "Failed to leave the workspace. Please try again.");
};

async function fetchActivityPage(
  workspaceId: string,
  cursor: string | null,
  limit: number
): Promise<PaginatedActivity> {
  const conditions: (SQL<unknown> | undefined)[] = [
    eq(activityLog.workspaceId, workspaceId),
  ];

  const decoded = decodeCursor(cursor);
  if (decoded) {
    const cursorCreatedAt = new Date(decoded.createdAt);
    conditions.push(
      or(
        lt(activityLog.createdAt, cursorCreatedAt),
        and(
          eq(activityLog.createdAt, cursorCreatedAt),
          lt(activityLog.id, decoded.id)
        )
      )
    );
  }

  const rows = await db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      metadata: activityLog.metadata,
      createdAt: activityLog.createdAt,
      userName: user.name,
      userImage: user.image,
    })
    .from(activityLog)
    .innerJoin(user, eq(activityLog.userId, user.id))
    .where(and(...conditions))
    .orderBy(desc(activityLog.createdAt), desc(activityLog.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
      : null;

  return { activities: parseStringify(pageRows), nextCursor };
}

// Activity feed, paginated via `(createdAt, id)` keyset cursor rather than the
// old fixed "last N" fetch — callers can keep calling with the previous
// `nextCursor` to page back through full workspace history.
export const getRecentActivity = async (
  workspaceId: string,
  options: GetActivityOptions = {}
): Promise<ActionResult<PaginatedActivity>> => {
  const cursor = options.cursor ?? null;
  const limit = options.limit ?? ACTIVITY_PAGE_SIZE;

  return safeAction(
    () =>
      unstable_cache(
        () => fetchActivityPage(workspaceId, cursor, limit),
        ["recent-activity", workspaceId, String(limit), cursor ?? "-"],
        { tags: [activityTag(workspaceId)], revalidate: 30 }
      )(),
    "Failed to load recent activity. Please try again."
  );
};
