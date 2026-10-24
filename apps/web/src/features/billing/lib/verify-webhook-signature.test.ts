import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "crypto";

const SECRET = "test-webhook-secret";

function sign(ts: number, body: string, secret = SECRET): string {
  const h1 = createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

describe("verifyPaddleWebhookSignature", () => {
  beforeEach(() => {
    vi.stubEnv("PADDLE_WEBHOOK_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws if PADDLE_WEBHOOK_SECRET isn't configured", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("PADDLE_WEBHOOK_SECRET", "");
    const { verifyPaddleWebhookSignature } = await import(
      "./verify-webhook-signature"
    );

    expect(() => verifyPaddleWebhookSignature("{}", "ts=1;h1=abc")).toThrow(
      /PADDLE_WEBHOOK_SECRET is not set/
    );
  });

  it("rejects a missing signature header", async () => {
    const { verifyPaddleWebhookSignature } = await import(
      "./verify-webhook-signature"
    );

    expect(verifyPaddleWebhookSignature("{}", null)).toBe(false);
  });

  it("rejects a header missing ts or h1", async () => {
    const { verifyPaddleWebhookSignature } = await import(
      "./verify-webhook-signature"
    );

    expect(verifyPaddleWebhookSignature("{}", "h1=abc")).toBe(false);
    expect(verifyPaddleWebhookSignature("{}", "ts=123")).toBe(false);
  });

  it("accepts a correctly signed, fresh payload", async () => {
    const { verifyPaddleWebhookSignature } = await import(
      "./verify-webhook-signature"
    );
    const body = JSON.stringify({ event_id: "evt_1" });
    const ts = Math.floor(Date.now() / 1000);

    expect(verifyPaddleWebhookSignature(body, sign(ts, body))).toBe(true);
  });

  it("rejects a payload whose body was tampered with after signing", async () => {
    const { verifyPaddleWebhookSignature } = await import(
      "./verify-webhook-signature"
    );
    const ts = Math.floor(Date.now() / 1000);
    const signature = sign(ts, JSON.stringify({ event_id: "evt_1" }));

    expect(
      verifyPaddleWebhookSignature(JSON.stringify({ event_id: "evt_2" }), signature)
    ).toBe(false);
  });

  it("rejects a signature produced with the wrong secret", async () => {
    const { verifyPaddleWebhookSignature } = await import(
      "./verify-webhook-signature"
    );
    const body = JSON.stringify({ event_id: "evt_1" });
    const ts = Math.floor(Date.now() / 1000);

    expect(
      verifyPaddleWebhookSignature(body, sign(ts, body, "wrong-secret"))
    ).toBe(false);
  });

  it("rejects a signature older than the replay-protection window", async () => {
    const { verifyPaddleWebhookSignature } = await import(
      "./verify-webhook-signature"
    );
    const body = JSON.stringify({ event_id: "evt_1" });
    const staleTs = Math.floor(Date.now() / 1000) - 10 * 60; // 10 minutes old

    expect(verifyPaddleWebhookSignature(body, sign(staleTs, body))).toBe(false);
  });
});
