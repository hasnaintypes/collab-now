import { createHmac, timingSafeEqual } from "crypto";

/**
 * Rejects a signature whose own timestamp is older than this, even if the
 * HMAC itself checks out — a defense against a leaked/intercepted signed
 * request being replayed long after the fact, separate from (and on top
 * of) `paddle-webhook-handler.ts`'s `lastEventAt` idempotency guard, which
 * only protects against *legitimate* at-least-once redelivery.
 */
const MAX_SIGNATURE_AGE_SECONDS = 5 * 60;

/**
 * Verifies Paddle's `Paddle-Signature` header (`ts=<unix-seconds>;h1=<hex-hmac>`)
 * per Paddle's documented webhook signing scheme: HMAC-SHA256 of
 * `${ts}:${rawBody}` using `PADDLE_WEBHOOK_SECRET`, hex-encoded. `rawBody`
 * must be the exact bytes Paddle sent — parsing and re-serializing the JSON
 * first would produce a different byte sequence and always fail
 * verification, so callers must read the request body as text, not JSON,
 * before this runs.
 *
 * Throws if `PADDLE_WEBHOOK_SECRET` isn't configured (a server
 * misconfiguration, not an invalid request) rather than silently returning
 * false — the API route maps that to a 500, distinct from the 401 an
 * actually-invalid signature gets.
 */
export function verifyPaddleWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "PADDLE_WEBHOOK_SECRET is not set. Add it to apps/web/.env (see .env.example)."
    );
  }

  if (!signatureHeader) {
    return false;
  }

  const parts = Object.fromEntries(
    signatureHeader
      .split(";")
      .map((part) => part.split("="))
      .filter((pair): pair is [string, string] => pair.length === 2)
  );
  const timestamp = parts.ts;
  const signature = parts.h1;
  if (!timestamp || !signature) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}:${rawBody}`)
    .digest("hex");

  // `timingSafeEqual` throws on mismatched buffer lengths rather than
  // returning false, so check lengths first — a different-length value is
  // never a match anyway.
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");
  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return false;
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  return Number.isFinite(ageSeconds) && ageSeconds <= MAX_SIGNATURE_AGE_SECONDS;
}
