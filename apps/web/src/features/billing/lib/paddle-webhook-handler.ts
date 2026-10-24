import { sql } from "drizzle-orm";
import { db, subscription } from "@collabnow/db";
import { PADDLE_PRICE_IDS } from "./paddle-config";
import type { PaidPlanId } from "../types";

export type PaddleWebhookEvent = {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: {
    id?: string;
    status?: string;
    customer_id?: string;
    custom_data?: Record<string, unknown> | null;
    items?: { price?: { id?: string } }[];
    current_billing_period?: { starts_at?: string; ends_at?: string } | null;
  };
};

const PRICE_ID_TO_PLAN: Partial<Record<string, PaidPlanId>> = Object.fromEntries(
  (Object.entries(PADDLE_PRICE_IDS) as [PaidPlanId, string][])
    .filter(([, priceId]) => priceId)
    .map(([plan, priceId]) => [priceId, plan])
);

function resolvePlan(event: PaddleWebhookEvent): PaidPlanId {
  const priceId = event.data.items?.[0]?.price?.id;
  const plan = priceId ? PRICE_ID_TO_PLAN[priceId] : undefined;
  if (!plan) {
    // Shouldn't happen in practice — every price id we ever create a
    // transaction with (features/billing/lib/paddle-api.ts) comes from
    // this same PADDLE_PRICE_IDS map — but a changed/retired price id in
    // the Paddle dashboard without updating env vars shouldn't crash
    // webhook processing, just record *something* plausible.
    console.error(
      `Paddle webhook ${event.event_id}: couldn't resolve a plan from price id "${priceId}" — defaulting to "pro".`
    );
    return "pro";
  }
  return plan;
}

function resolveWorkspaceId(event: PaddleWebhookEvent): string | null {
  const workspaceId = event.data.custom_data?.workspaceId;
  return typeof workspaceId === "string" && workspaceId ? workspaceId : null;
}

async function upsertSubscription(params: {
  workspaceId: string;
  /**
   * `undefined` means "don't touch the stored plan" — used by
   * `subscription.canceled`, which only changes `status`/clears the
   * billing period. A workspace's plan doesn't change on cancellation, so
   * there's nothing to resolve from the event, and nothing to risk
   * overwriting a correct "team"/"pro" value with `resolvePlan`'s "pro"
   * fallback if the event's price id can't be matched.
   */
  plan: PaidPlanId | undefined;
  status: string;
  paddleSubscriptionId: string | null;
  paddleCustomerId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  occurredAt: Date;
}): Promise<void> {
  const {
    workspaceId,
    plan,
    status,
    paddleSubscriptionId,
    paddleCustomerId,
    currentPeriodStart,
    currentPeriodEnd,
    occurredAt,
  } = params;

  // Insert-or-update keyed on the workspace's one-row-per-workspace
  // uniqueness (P3-1), only applying the update when this event is at
  // least as new as whatever's already stored — see `lastEventAt`'s doc
  // comment in packages/db/src/schema/app.ts for why that's both the
  // idempotency and the out-of-order-delivery guard. `<=`, not `<`: Paddle
  // can fire two genuinely different events (e.g. created then updated)
  // with an identical `occurred_at`, and a strict `<` would silently drop
  // the second one instead of applying it — re-applying an exact replay's
  // identical values on `<=` is harmless, since nothing actually changes.
  await db
    .insert(subscription)
    .values({
      workspaceId,
      // No existing row to preserve a plan from — shouldn't happen in
      // practice (nothing can be canceled before it's created), but the
      // column is NOT NULL, so fall back to "free" rather than "pro".
      plan: plan ?? "free",
      status,
      paddleSubscriptionId,
      paddleCustomerId,
      currentPeriodStart,
      currentPeriodEnd,
      lastEventAt: occurredAt,
    })
    .onConflictDoUpdate({
      target: subscription.workspaceId,
      set: {
        ...(plan !== undefined ? { plan } : {}),
        status,
        paddleSubscriptionId,
        paddleCustomerId,
        currentPeriodStart,
        currentPeriodEnd,
        lastEventAt: occurredAt,
        updatedAt: new Date(),
      },
      where: sql`${subscription.lastEventAt} is null or ${subscription.lastEventAt} <= ${occurredAt}`,
    });
}

/**
 * Applies one verified Paddle webhook event (P3-3). The API route
 * (`app/api/webhooks/paddle/route.ts`) verifies the signature and basic
 * shape before calling this — everything here assumes `event` is genuinely
 * from Paddle.
 */
export async function applyPaddleWebhookEvent(
  event: PaddleWebhookEvent
): Promise<void> {
  const workspaceId = resolveWorkspaceId(event);
  if (!workspaceId) {
    console.error(
      `Paddle webhook ${event.event_id} (${event.event_type}) has no custom_data.workspaceId — ignoring.`
    );
    return;
  }

  const occurredAt = new Date(event.occurred_at);

  switch (event.event_type) {
    case "subscription.created":
    case "subscription.updated":
      await upsertSubscription({
        workspaceId,
        plan: resolvePlan(event),
        status: event.data.status ?? "active",
        paddleSubscriptionId: event.data.id ?? null,
        paddleCustomerId: event.data.customer_id ?? null,
        currentPeriodStart: event.data.current_billing_period?.starts_at
          ? new Date(event.data.current_billing_period.starts_at)
          : null,
        currentPeriodEnd: event.data.current_billing_period?.ends_at
          ? new Date(event.data.current_billing_period.ends_at)
          : null,
        occurredAt,
      });
      return;

    case "subscription.canceled":
      await upsertSubscription({
        workspaceId,
        plan: undefined,
        status: "canceled",
        paddleSubscriptionId: event.data.id ?? null,
        paddleCustomerId: event.data.customer_id ?? null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        occurredAt,
      });
      return;

    case "transaction.payment_failed":
      // A transaction event has no plan/price shape of its own to upsert
      // a full row from, and shouldn't ever need to insert one — a
      // payment can't fail against a subscription that was never
      // created. Paddle usually also sends a subscription.updated with
      // status=past_due around the same failure, but Paddle gives no
      // ordering guarantee between the two, so this update stands on its
      // own rather than assuming that second event will land.
      await db
        .update(subscription)
        .set({ status: "past_due", lastEventAt: occurredAt, updatedAt: new Date() })
        .where(
          sql`${subscription.workspaceId} = ${workspaceId} and (${subscription.lastEventAt} is null or ${subscription.lastEventAt} <= ${occurredAt})`
        );
      return;

    default:
      // Every other Paddle event type (trialing, paused, resumed,
      // transaction.completed, etc.) is an intentional no-op — P3-3's
      // acceptance criteria only calls out created/updated/canceled/
      // payment-failed.
      return;
  }
}
