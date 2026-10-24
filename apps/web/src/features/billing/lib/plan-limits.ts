import type { PlanId } from "../types";

/**
 * Per-plan monthly notes-generation caps (P3-6 / PRD §6.12, FR-20) —
 * finalized against an *estimated* Gemini cost model (no real production
 * usage exists yet; see §6.12's "Plan-limit rationale" for the full
 * worksheet and pricing sources), not real Phase 1/2 usage data. This is
 * the single place these numbers live, so revisiting them once real usage
 * data exists is a one-line change here, not a hunt through every caller.
 * Team's cap (3× Pro, not equal to it) is shared across every seat in the
 * workspace — same as Free/Pro are already workspace- rather than
 * user-scoped (see `subscription`'s own doc comment in
 * packages/db/src/schema/app.ts) — under the assumption of an average
 * ~3-seat team; that multiplier is the number most likely to need
 * revisiting once real team sizes are observed.
 */
export const PLAN_NOTES_LIMIT: Record<PlanId, number> = {
  free: 5,
  pro: 100,
  team: 300,
};

/**
 * Only Pro/Team plans include the "Ask about this" chat feature (PRD
 * §6.12's table, FR-21). Free keeps full collaboration access — documents,
 * comments, sharing, workspaces — just not this.
 */
export function planIncludesChat(plan: PlanId): boolean {
  return plan !== "free";
}
