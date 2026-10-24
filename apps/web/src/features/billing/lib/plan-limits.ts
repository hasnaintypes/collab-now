import type { PlanId } from "../types";

/**
 * Per-plan monthly notes-generation caps (P3-4 / PRD §6.12, FR-20). The
 * numbers in that table are explicitly marked "e.g." placeholders there —
 * P3-6 finalizes them against real Gemini cost data once Phase 1/2 usage
 * exists to model from. This is the single place those numbers live, so
 * finalizing them later is a one-line change here, not a hunt through
 * every caller. Team's cap is shared across every seat in the workspace,
 * same as Free/Pro are already workspace- rather than user-scoped (see
 * `subscription`'s own doc comment in packages/db/src/schema/app.ts).
 */
export const PLAN_NOTES_LIMIT: Record<PlanId, number> = {
  free: 5,
  pro: 100,
  team: 100,
};

/**
 * Only Pro/Team plans include the "Ask about this" chat feature (PRD
 * §6.12's table, FR-21). Free keeps full collaboration access — documents,
 * comments, sharing, workspaces — just not this.
 */
export function planIncludesChat(plan: PlanId): boolean {
  return plan !== "free";
}
