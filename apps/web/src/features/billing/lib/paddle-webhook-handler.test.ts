import { describe, expect, it, vi, beforeEach } from "vitest";

// Mocks `db.insert(...).values(...).onConflictDoUpdate(...)` (the upsert
// path for created/updated/canceled) and `db.update(...).set(...).where(...)`
// (the payment_failed path) separately, same `vi.hoisted` style as
// lib/rate-limit's own test for the same insert-chain shape.
const {
  onConflictDoUpdateMock,
  valuesMock,
  insertMock,
  whereMock,
  setMock,
  updateMock,
} = vi.hoisted(() => {
  const onConflictDoUpdateMock = vi.fn(() => Promise.resolve());
  const valuesMock = vi.fn(() => ({ onConflictDoUpdate: onConflictDoUpdateMock }));
  const insertMock = vi.fn(() => ({ values: valuesMock }));
  const whereMock = vi.fn(() => Promise.resolve());
  const setMock = vi.fn(() => ({ where: whereMock }));
  const updateMock = vi.fn(() => ({ set: setMock }));
  return {
    onConflictDoUpdateMock,
    valuesMock,
    insertMock,
    whereMock,
    setMock,
    updateMock,
  };
});

vi.mock("@collabnow/db", () => ({
  db: { insert: insertMock, update: updateMock },
  subscription: {
    workspaceId: "subscription.workspace_id",
    lastEventAt: "subscription.last_event_at",
  },
}));

vi.mock("./paddle-config", () => ({
  PADDLE_PRICE_IDS: { pro: "pri_pro_123", team: "pri_team_123" },
}));

const { applyPaddleWebhookEvent } = await import("./paddle-webhook-handler");

function event(overrides: Partial<Parameters<typeof applyPaddleWebhookEvent>[0]>) {
  return {
    event_id: "evt_1",
    event_type: "subscription.created",
    occurred_at: "2026-01-01T00:00:00Z",
    data: { custom_data: { workspaceId: "workspace-1" } },
    ...overrides,
  };
}

beforeEach(() => {
  insertMock.mockClear();
  valuesMock.mockClear();
  onConflictDoUpdateMock.mockClear();
  updateMock.mockClear();
  setMock.mockClear();
  whereMock.mockClear();
});

describe("applyPaddleWebhookEvent", () => {
  it("ignores an event with no custom_data.workspaceId, never touching the database", async () => {
    await applyPaddleWebhookEvent(event({ data: {} }));

    expect(insertMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("ignores an event type outside the four P3-3 acceptance criteria", async () => {
    await applyPaddleWebhookEvent(event({ event_type: "subscription.trialing" }));

    expect(insertMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("upserts plan/status from subscription.created, resolving plan from the price id", async () => {
    await applyPaddleWebhookEvent(
      event({
        event_type: "subscription.created",
        data: {
          id: "sub_1",
          status: "active",
          customer_id: "ctm_1",
          custom_data: { workspaceId: "workspace-1" },
          items: [{ price: { id: "pri_team_123" } }],
          current_billing_period: {
            starts_at: "2026-01-01T00:00:00Z",
            ends_at: "2026-02-01T00:00:00Z",
          },
        },
      })
    );

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "workspace-1",
        plan: "team",
        status: "active",
        paddleSubscriptionId: "sub_1",
        paddleCustomerId: "ctm_1",
      })
    );
  });

  it("defaults to the pro plan with a warning when the price id doesn't match a configured plan", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await applyPaddleWebhookEvent(
      event({
        data: {
          custom_data: { workspaceId: "workspace-1" },
          items: [{ price: { id: "pri_unknown" } }],
        },
      })
    );

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "pro" })
    );
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("marks the subscription canceled on subscription.canceled, clearing the billing period", async () => {
    await applyPaddleWebhookEvent(
      event({
        event_type: "subscription.canceled",
        data: {
          id: "sub_1",
          custom_data: { workspaceId: "workspace-1" },
          items: [{ price: { id: "pri_pro_123" } }],
        },
      })
    );

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "canceled",
        currentPeriodStart: null,
        currentPeriodEnd: null,
      })
    );
  });

  it("never overwrites the stored plan on cancellation, even with no price id to resolve", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await applyPaddleWebhookEvent(
      event({
        event_type: "subscription.canceled",
        data: { id: "sub_1", custom_data: { workspaceId: "workspace-1" } },
      })
    );

    // The fresh-insert branch still needs *some* plan value to satisfy the
    // NOT NULL column, but the update-on-conflict `set` must omit `plan`
    // entirely — a Team-plan workspace canceling must never get silently
    // downgraded to "pro"/"free" just because this event carries no price
    // id to resolve.
    const call = onConflictDoUpdateMock.mock.calls[0] as unknown as [
      { set: Record<string, unknown> },
    ];
    const { set } = call[0];
    expect(set).not.toHaveProperty("plan");
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("marks the subscription past_due on transaction.payment_failed via an update, not an upsert", async () => {
    await applyPaddleWebhookEvent(
      event({ event_type: "transaction.payment_failed" })
    );

    expect(updateMock).toHaveBeenCalled();
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "past_due" })
    );
    expect(insertMock).not.toHaveBeenCalled();
  });
});
