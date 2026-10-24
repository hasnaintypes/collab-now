/** Paid plans a workspace can check out into via Paddle (P3-2). "free" is the
 * default for every workspace that has never upgraded — see
 * `getWorkspaceSubscription` in `actions/billing.actions.ts`. */
export type PaidPlanId = "pro" | "team";
export type PlanId = "free" | PaidPlanId;

export type WorkspaceSubscription = {
  plan: PlanId;
  /** Mirrors Paddle's own subscription statuses — "active" for a workspace
   * that has never subscribed, since there's nothing to be past-due on. */
  status: string;
};
