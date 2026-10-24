import { describe, expect, it, vi, beforeEach } from "vitest";

function selectChain(rows: unknown[]) {
  const builder: {
    from: () => typeof builder;
    where: () => typeof builder;
    limit: () => Promise<unknown[]>;
  } = {} as never;
  builder.from = vi.fn(() => builder);
  builder.where = vi.fn(() => builder);
  builder.limit = vi.fn(() => Promise.resolve(rows));
  return builder;
}

const { dbMock } = vi.hoisted(() => ({ dbMock: { select: vi.fn() } }));

vi.mock("@collabnow/db", () => ({
  db: dbMock,
  subscription: {
    workspaceId: "subscription.workspace_id",
    plan: "subscription.plan",
    status: "subscription.status",
  },
}));

const { getEffectivePlan } = await import("./workspace-plan");

beforeEach(() => {
  dbMock.select.mockReset();
});

describe("getEffectivePlan", () => {
  it("defaults to free when the workspace has no subscription row", async () => {
    dbMock.select.mockReturnValueOnce(selectChain([]));

    expect(await getEffectivePlan("workspace-1")).toBe("free");
  });

  it("returns the stored plan when the subscription is active", async () => {
    dbMock.select.mockReturnValueOnce(
      selectChain([{ plan: "team", status: "active" }])
    );

    expect(await getEffectivePlan("workspace-1")).toBe("team");
  });

  it("falls back to free for a canceled subscription, even though plan is still \"pro\"/\"team\" on the row", async () => {
    // P3-3's webhook handler deliberately never resets `plan` on
    // cancellation (overwriting it risked corrupting the stored value) —
    // this is the function responsible for not treating that stale value
    // as current entitlement.
    dbMock.select.mockReturnValueOnce(
      selectChain([{ plan: "team", status: "canceled" }])
    );

    expect(await getEffectivePlan("workspace-1")).toBe("free");
  });

  it("falls back to free for a past_due subscription", async () => {
    dbMock.select.mockReturnValueOnce(
      selectChain([{ plan: "pro", status: "past_due" }])
    );

    expect(await getEffectivePlan("workspace-1")).toBe("free");
  });
});
