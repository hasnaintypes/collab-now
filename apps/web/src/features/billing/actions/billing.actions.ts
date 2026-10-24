"use server";

import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { db, subscription, workspaceMember } from "@collabnow/db";
import { auth } from "@/features/auth/lib";
import { requireWorkspaceMembership } from "@/lib/workspace";
import {
  type ActionResult,
  ActionError,
  actionError,
  safeAction,
} from "@/lib/action-result";
import { createPaddleTransaction } from "../lib/paddle-api";
import { PADDLE_PRICE_IDS } from "../lib/paddle-config";
import { resolveEffectivePlan } from "../lib/workspace-plan";
import type { PaidPlanId, WorkspaceSubscription } from "../types";

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

    // The displayed plan must match what's actually enforced — a
    // canceled/past-due subscription keeps its raw `plan` value on the
    // row by design (P3-3), so this can't just return it verbatim, or
    // Settings could show "Team" to a workspace job-service.ts/
    // chat.actions.ts are already enforcing as free.
    return {
      plan: resolveEffectivePlan(row),
      status: row?.status ?? "active",
    };
  }, "Failed to load billing information.");
};

/**
 * Creates a Paddle transaction for the given workspace/plan and returns its
 * id for the client to open with `Paddle.Checkout.open({ transactionId })`
 * (`upgrade-button.tsx`). This — not the UI-level `canManageBilling` prop
 * gating whether the button even renders — is the actual authorization
 * boundary: re-deriving the session and the caller's workspace role here,
 * same as the owner/admin check in `workspace.actions.ts`'s member-removal
 * actions, means a non-admin can't start a real checkout for a workspace
 * they don't administer just by calling this action directly (e.g. via
 * devtools), the way they could if the client were trusted to pass
 * `workspaceId` straight into `Checkout.open()`'s `customData`.
 */
export const createCheckoutTransaction = async ({
  workspaceId,
  plan,
}: {
  workspaceId: string;
  plan: PaidPlanId;
}): Promise<ActionResult<{ transactionId: string }>> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return actionError("You must be signed in to upgrade a plan.");
  }

  return safeAction(async () => {
    const [actor] = await db
      .select({ role: workspaceMember.role })
      .from(workspaceMember)
      .where(
        and(
          eq(workspaceMember.workspaceId, workspaceId),
          eq(workspaceMember.userId, session.user.id)
        )
      )
      .limit(1);

    if (!actor || (actor.role !== "owner" && actor.role !== "admin")) {
      throw new ActionError(
        "Only workspace owners and admins can manage billing."
      );
    }

    const priceId = PADDLE_PRICE_IDS[plan];
    if (!priceId) {
      throw new ActionError("Checkout isn't configured yet for this plan.");
    }

    const transaction = await createPaddleTransaction({
      priceId,
      customData: { workspaceId },
    });

    return { transactionId: transaction.id };
  }, "Failed to start checkout. Please try again.");
};
