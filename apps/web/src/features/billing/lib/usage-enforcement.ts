import { and, eq, sql } from "drizzle-orm";
import { db, usageCounter } from "@collabnow/db";
import { getEffectivePlan } from "./workspace-plan";
import { PLAN_NOTES_LIMIT } from "./plan-limits";
import { currentUsagePeriod } from "./usage-period";

export type UsageReservationResult = {
  allowed: boolean;
  limit: number;
  used: number;
  /** The exact period this reservation was made against — callers that
   * might later need to release it (`job-service.ts`) must pass this back
   * to `releaseNotesGenerationSlot` rather than letting it recompute
   * "now" itself, which could land in a different calendar month if the
   * release happens right around a UTC month boundary. */
  periodStart: Date;
};

/**
 * Reserves one notes-generation slot for a workspace's current billing
 * period, or reports that its plan limit is already reached — P3-4 / PRD
 * FR-20's "enforce before enqueueing, not after" requirement, called from
 * `job-service.ts`'s `enqueueIngestionJobForUser` *before* the ingestion
 * job row is created.
 *
 * The increment and the limit check happen in one atomic upsert rather
 * than "read count, compare, then write" as two steps — two concurrent
 * submissions for the same workspace could otherwise both read a count
 * just under the limit and both pass, overshooting it. The `WHERE` clause
 * on `onConflictDoUpdate` makes Postgres itself serialize that decision
 * via the row's own lock: if the stored count is already at the limit,
 * the update is skipped entirely (not applied and then rolled back — the
 * row is simply never touched for this call) and `.returning()` comes
 * back empty, which this function reads as "blocked" rather than
 * incrementing anyway and hoping to catch it after the fact.
 */
export async function reserveNotesGenerationSlot(
  workspaceId: string
): Promise<UsageReservationResult> {
  const plan = await getEffectivePlan(workspaceId);
  // `subscription.plan` is a plain unconstrained `text` column (validated
  // at the app layer, not the DB) — fall back to Free's limit rather than
  // an `undefined` one if it ever holds something outside the three known
  // plans, which would otherwise make the `< limit` guard below compare
  // against `NULL` and silently block every reservation for that
  // workspace, even at zero usage.
  const limit = PLAN_NOTES_LIMIT[plan] ?? PLAN_NOTES_LIMIT.free;
  const { periodStart, periodEnd } = currentUsagePeriod();

  const [reserved] = await db
    .insert(usageCounter)
    .values({ workspaceId, periodStart, periodEnd, notesGenerated: 1 })
    .onConflictDoUpdate({
      target: [usageCounter.workspaceId, usageCounter.periodStart],
      set: {
        notesGenerated: sql`${usageCounter.notesGenerated} + 1`,
        updatedAt: new Date(),
      },
      where: sql`${usageCounter.notesGenerated} < ${limit}`,
    })
    .returning({ notesGenerated: usageCounter.notesGenerated });

  if (reserved) {
    return { allowed: true, limit, used: reserved.notesGenerated, periodStart };
  }

  // The WHERE guard blocked the update — already at/over the limit for
  // this period. Read the real count back just for the error message
  // (`used` of the rejection result); this extra query only happens on
  // the already-at-cap path, not on every call.
  const [existing] = await db
    .select({ notesGenerated: usageCounter.notesGenerated })
    .from(usageCounter)
    .where(
      and(
        eq(usageCounter.workspaceId, workspaceId),
        eq(usageCounter.periodStart, periodStart)
      )
    )
    .limit(1);

  return { allowed: false, limit, used: existing?.notesGenerated ?? limit, periodStart };
}

/**
 * Releases a slot reserved by `reserveNotesGenerationSlot` when the job it
 * was reserved for never actually got queued (`job-service.ts`'s
 * insert/`inngest.send` failure path) — a workspace shouldn't be charged
 * quota for a job that never ran. Floors at 0 via `GREATEST` rather than
 * letting concurrent reserve/release calls push the count negative.
 *
 * `periodStart` must be the one `reserveNotesGenerationSlot` returned for
 * the reservation being released, not freshly recomputed — recomputing
 * "now" here could land in a different calendar month than the
 * reservation if the release happens right around a UTC month boundary,
 * in which case this would silently update zero rows and the original
 * period's counter would stay over-incremented forever.
 */
export async function releaseNotesGenerationSlot(
  workspaceId: string,
  periodStart: Date
): Promise<void> {
  await db
    .update(usageCounter)
    .set({
      notesGenerated: sql`greatest(${usageCounter.notesGenerated} - 1, 0)`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(usageCounter.workspaceId, workspaceId),
        eq(usageCounter.periodStart, periodStart)
      )
    );
}
