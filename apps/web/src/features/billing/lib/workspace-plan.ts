import { eq } from "drizzle-orm";
import { db, subscription } from "@collabnow/db";
import type { PlanId } from "../types";

/**
 * The plan a workspace is actually entitled to right now — not just
 * whatever `subscription.plan` says. A canceled/past-due subscription
 * keeps its `plan` value on the row by design (see
 * `features/billing/lib/paddle-webhook-handler.ts`'s P3-3 fix — overwriting
 * it on cancellation risked corrupting what plan a workspace *was* on), so
 * enforcement has to be the one place that checks `status` and falls back
 * to "free" when it isn't "active", rather than trusting `plan` alone.
 */
export async function getEffectivePlan(workspaceId: string): Promise<PlanId> {
  const [row] = await db
    .select({ plan: subscription.plan, status: subscription.status })
    .from(subscription)
    .where(eq(subscription.workspaceId, workspaceId))
    .limit(1);

  if (!row || row.status !== "active") {
    return "free";
  }

  return row.plan as PlanId;
}
