/**
 * The calendar-month (UTC) boundaries `usage_counter` rows are keyed to —
 * a deliberate simplification ahead of P3-6 rather than trying to align
 * with each workspace's actual Paddle billing cycle (which starts on
 * whatever date a subscription was created, not necessarily the 1st, and
 * differs per subscription). `usage_counter`'s `(workspaceId, periodStart)`
 * uniqueness (P3-1) just needs *some* stable, deterministic boundary every
 * caller agrees on — calendar month is simplest, and free-tier workspaces
 * have no Paddle billing cycle to align with anyway.
 */
export function currentUsagePeriod(now: Date = new Date()): {
  periodStart: Date;
  periodEnd: Date;
} {
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );
  return { periodStart, periodEnd };
}
