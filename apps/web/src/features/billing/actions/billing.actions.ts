"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, subscription } from "@collabnow/db";
import { auth } from "@/features/auth/lib";
import { requireWorkspaceMembership } from "@/lib/workspace";
import { type ActionResult, actionError, safeAction } from "@/lib/action-result";
import type { WorkspaceSubscription } from "../types";

/**
 * Reads a workspace's current plan/status (P3-1's `subscription` table).
 * Checkout (P3-2) and webhook-driven upgrades (P3-3) are the only things
 * that ever create a row — a workspace that has never upgraded has none,
 * so this falls back to the same "free"/"active" defaults the table's own
 * columns default new rows to, rather than requiring every workspace to be
 * backfilled with one up front.
 */
export const getWorkspaceSubscription = async (
  workspaceId: string
): Promise<ActionResult<WorkspaceSubscription>> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return actionError("You must be signed in to view billing information.");
  }

  return safeAction(async () => {
    await requireWorkspaceMembership(workspaceId, session.user.id);

    const [row] = await db
      .select({ plan: subscription.plan, status: subscription.status })
      .from(subscription)
      .where(eq(subscription.workspaceId, workspaceId))
      .limit(1);

    return (row as WorkspaceSubscription | undefined) ?? {
      plan: "free",
      status: "active",
    };
  }, "Failed to load billing information.");
};
