import { verifyPaddleWebhookSignature } from "@/features/billing/lib/verify-webhook-signature";
import {
  applyPaddleWebhookEvent,
  type PaddleWebhookEvent,
} from "@/features/billing/lib/paddle-webhook-handler";

/**
 * P3-3: Paddle webhook endpoint. Reads the body as raw text — never
 * `request.json()` — because signature verification needs the exact bytes
 * Paddle sent; parsing and re-serializing first would change them and
 * always fail.
 *
 * Always responds 200 once an event is successfully applied (including
 * when `applyPaddleWebhookEvent` no-ops it as a duplicate/out-of-order
 * replay — that's still "successfully handled", not a failure). Only a
 * genuine processing error returns 500, which tells Paddle to retry; that
 * retry is safe because of the same idempotency guard.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("paddle-signature");

  let verified: boolean;
  try {
    verified = verifyPaddleWebhookSignature(rawBody, signatureHeader);
  } catch (error) {
    console.error("Paddle webhook signature verification is misconfigured:", error);
    return new Response("Webhook misconfigured.", { status: 500 });
  }

  if (!verified) {
    return new Response("Invalid signature.", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Malformed JSON.", { status: 400 });
  }

  if (!isPaddleWebhookEvent(payload)) {
    return new Response("Unrecognized event shape.", { status: 400 });
  }

  try {
    await applyPaddleWebhookEvent(payload);
  } catch (error) {
    console.error(`Failed to apply Paddle webhook ${payload.event_id}:`, error);
    return new Response("Failed to process webhook.", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}

function isPaddleWebhookEvent(value: unknown): value is PaddleWebhookEvent {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.event_id === "string" &&
    typeof record.event_type === "string" &&
    typeof record.occurred_at === "string" &&
    typeof record.data === "object" &&
    record.data !== null
  );
}
