import { describe, expect, it, vi, beforeEach } from "vitest";

// Same mocking style as chat.actions.test.ts/ingestion.actions.test.ts:
// mock `@collabnow/db` and `next/headers`/`@/features/auth/lib` rather than
// hitting a real database. `requireWorkspaceMembership` (`@/lib/workspace`)
// is left unmocked so its own `db.select` call is exercised for real
// against this same `dbMock`.
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

const { dbMock } = vi.hoisted(() => {
  const dbMock = { select: vi.fn() };
  return { dbMock };
});

vi.mock("@collabnow/db", () => ({
  db: dbMock,
  subscription: {
    workspaceId: "subscription.workspace_id",
    plan: "subscription.plan",
    status: "subscription.status",
  },
  workspaceMember: {
    id: "workspace_member.id",
    workspaceId: "workspace_member.workspace_id",
    userId: "workspace_member.user_id",
  },
}));

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock("@/features/auth/lib", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

const { createPaddleTransactionMock } = vi.hoisted(() => ({
  createPaddleTransactionMock: vi.fn(),
}));
vi.mock("../lib/paddle-api", () => ({
  createPaddleTransaction: createPaddleTransactionMock,
}));

vi.mock("../lib/paddle-config", () => ({
  PADDLE_PRICE_IDS: { pro: "pri_pro_123", team: "pri_team_123" },
}));

const { getWorkspaceSubscription, createCheckoutTransaction } = await import(
  "./billing.actions"
);

beforeEach(() => {
  dbMock.select.mockReset();
  getSessionMock.mockReset();
  createPaddleTransactionMock.mockReset();
});

describe("getWorkspaceSubscription", () => {
  it("rejects when the caller isn't signed in", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await getWorkspaceSubscription("workspace-1");

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to view billing information.",
    });
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it("rejects a signed-in user who isn't a member of the workspace", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(selectChain([])); // membership check

    const result = await getWorkspaceSubscription("workspace-1");

    expect(result).toEqual({
      success: false,
      error: "You don't have access to this workspace.",
    });
  });

  it("defaults to the free plan when the workspace has no subscription row", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select
      .mockReturnValueOnce(selectChain([{ id: "member-1" }])) // membership check
      .mockReturnValueOnce(selectChain([])); // no subscription row

    const result = await getWorkspaceSubscription("workspace-1");

    expect(result).toEqual({
      success: true,
      data: { plan: "free", status: "active" },
    });
  });

  it("returns the workspace's actual plan/status when a subscription row exists", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select
      .mockReturnValueOnce(selectChain([{ id: "member-1" }])) // membership check
      .mockReturnValueOnce(selectChain([{ plan: "pro", status: "active" }]));

    const result = await getWorkspaceSubscription("workspace-1");

    expect(result).toEqual({
      success: true,
      data: { plan: "pro", status: "active" },
    });
  });

  it("reports the free plan for a canceled subscription, matching what P3-4's enforcement actually grants", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select
      .mockReturnValueOnce(selectChain([{ id: "member-1" }]))
      .mockReturnValueOnce(selectChain([{ plan: "team", status: "canceled" }]));

    const result = await getWorkspaceSubscription("workspace-1");

    expect(result).toEqual({
      success: true,
      data: { plan: "free", status: "canceled" },
    });
  });
});

describe("createCheckoutTransaction", () => {
  const params = { workspaceId: "workspace-1", plan: "pro" as const };

  it("rejects when the caller isn't signed in", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await createCheckoutTransaction(params);

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to upgrade a plan.",
    });
    expect(createPaddleTransactionMock).not.toHaveBeenCalled();
  });

  // The actual authorization boundary this action exists for: the client
  // passing `canManageBilling: true` to render the button proves nothing —
  // this re-checks the caller's real workspace role before ever touching
  // Paddle, so a non-admin calling this action directly (e.g. via devtools)
  // still can't start a checkout for a workspace they don't administer.
  it("rejects a member who isn't an owner/admin of the workspace", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(selectChain([{ role: "member" }]));

    const result = await createCheckoutTransaction(params);

    expect(result).toEqual({
      success: false,
      error: "Only workspace owners and admins can manage billing.",
    });
    expect(createPaddleTransactionMock).not.toHaveBeenCalled();
  });

  it("rejects a user with no membership row at all", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(selectChain([]));

    const result = await createCheckoutTransaction(params);

    expect(result.success).toBe(false);
    expect(createPaddleTransactionMock).not.toHaveBeenCalled();
  });

  it("creates a Paddle transaction with workspaceId baked into customData for an owner", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(selectChain([{ role: "owner" }]));
    createPaddleTransactionMock.mockResolvedValueOnce({ id: "txn_123" });

    const result = await createCheckoutTransaction(params);

    expect(createPaddleTransactionMock).toHaveBeenCalledWith({
      priceId: "pri_pro_123",
      customData: { workspaceId: "workspace-1" },
    });
    expect(result).toEqual({
      success: true,
      data: { transactionId: "txn_123" },
    });
  });

  it("allows an admin (not just the owner) to start checkout", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(selectChain([{ role: "admin" }]));
    createPaddleTransactionMock.mockResolvedValueOnce({ id: "txn_456" });

    const result = await createCheckoutTransaction(params);

    expect(result.success).toBe(true);
  });
});
