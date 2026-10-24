import { PADDLE_ENV } from "./paddle-config";

/**
 * Server-only Paddle REST client. `PADDLE_API_KEY` is read lazily (same
 * pattern as `lib/gemini/index.ts`) so importing this module doesn't blow
 * up before the env var is set.
 *
 * Creating the transaction here — after `createCheckoutTransaction` in
 * `../actions/billing.actions.ts` re-verifies the caller's workspace role
 * server-side — is what actually enforces "only owners/admins can start a
 * checkout" for P3-2. `custom_data.workspaceId` is baked into the
 * transaction at creation time, so a client can no longer forge it by
 * passing an arbitrary value into `Paddle.Checkout.open()` directly —
 * that's why `load-paddle.ts`'s `Checkout.open()` only ever takes a
 * `transactionId`, never raw `items`/`customData`.
 */

const PADDLE_API_BASE =
  PADDLE_ENV === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

function getApiKey(): string {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "PADDLE_API_KEY is not set. Add it to apps/web/.env (see .env.example)."
    );
  }
  return apiKey;
}

export async function createPaddleTransaction({
  priceId,
  customData,
}: {
  priceId: string;
  customData: Record<string, string>;
}): Promise<{ id: string }> {
  const response = await fetch(`${PADDLE_API_BASE}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ price_id: priceId, quantity: 1 }],
      custom_data: customData,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Paddle transaction creation failed (${response.status}): ${body}`
    );
  }

  const json = (await response.json()) as { data: { id: string } };
  return { id: json.data.id };
}
