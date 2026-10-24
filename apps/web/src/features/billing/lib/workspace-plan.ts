import { eq } from "drizzle-orm";
import { db, subscription } from "@collabnow/db";
import type { PlanId } from "../types";

type SubscriptionRow = { plan: string; status: string } | undefined;

/**
 * The plan a workspace is actually entitled to right now, given a
 * subscription row (or none) a caller already fetched — not just whatever
 * `subscription.plan` says. A canceled/past-due subscription keeps its
 * `plan` value on the row by design (see `features/billing/lib/
 * paddle-webhook-handler.ts`'s P3-3 fix — overwriting it on cancellation
 * risked corrupting what plan a workspace *was* on), so this is the one
 * place that checks `status` and falls back to "free" when it isn't
 * "active", rather than trusting `plan` alone. Pure/sync and exported
 * separately from `getEffectivePlan` below so `getWorkspaceSubscription`
 * (`features/billing/actions/billing.actions.ts`) can apply the exact
 * same rule to a row it already has, instead of either duplicating the
 * logic or re-querying the database a second time just to agree with it —
 * Settings' billing section and job-service.ts's/chat.actions.ts's
 * enforcement must never disagree about which plan is actually in effect.
 */
export function resolveEffectivePlan(row: SubscriptionRow): PlanId {
  if (!row || row.status !== "active") {
    return "free";
  }
  return row.plan as PlanId;
}

export async function getEffectivePlan(workspaceId: string): Promise<PlanId> {
  const [row] = await db
    .select({ plan: subscription.plan, status: subscription.status })
    .from(subscription)
    .where(eq(subscription.workspaceId, workspaceId))
    .limit(1);

  return resolveEffectivePlan(row);
}
