"use server";

import { nanoid } from "nanoid";
import { db } from "@/db";
import {
  workspace,
  workspaceMember,
  workspaceInvite,
  activityLog,
} from "@/db/schema/app";
import { user } from "@/db/schema/auth";
import { eq, and, ilike, or, gt, notInArray, count } from "drizzle-orm";
import { parseStringify } from "../utils";
import { sendMail } from "../mail";
import { inviteEmailHtml } from "../mail-templates";

export const getOrCreateWorkspace = async (
  userId: string,
  userName: string
) => {
  try {
    // Check if user already belongs to a workspace
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
  } catch (error) {
    console.error(`Failed to get or create workspace: ${error}`);
    throw error;
  }
};

export const getWorkspaceMembers = async (workspaceId: string) => {
  try {
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
  } catch (error) {
    console.error(`Failed to get workspace members: ${error}`);
    throw error;
  }
};

export const searchUsers = async ({
  query,
  workspaceId,
}: {
  query: string;
  workspaceId: string;
}) => {
  try {
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
  } catch (error) {
    console.error(`Failed to search users: ${error}`);
    throw error;
  }
};

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
}) => {
  try {
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
        return { error: "User is already a member of this workspace" };
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
      return { error: "An invite has already been sent to this email" };
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

    return parseStringify(invite);
  } catch (error) {
    console.error(`Failed to invite member: ${error}`);
    throw error;
  }
};

export const acceptInvite = async (token: string) => {
  try {
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
      return { error: "Invite is invalid or has expired" };
    }

    // Find user by email
    const [invitedUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, invite.email))
      .limit(1);

    if (!invitedUser) {
      return {
        needsSignUp: true,
        email: invite.email,
      };
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

    return { success: true, workspaceId: invite.workspaceId };
  } catch (error) {
    console.error(`Failed to accept invite: ${error}`);
    throw error;
  }
};

export const getPendingInvites = async (workspaceId: string) => {
  try {
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
  } catch (error) {
    console.error(`Failed to get pending invites: ${error}`);
    throw error;
  }
};
