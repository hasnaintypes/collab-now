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

const { getWorkspaceSubscription } = await import("./billing.actions");

beforeEach(() => {
  dbMock.select.mockReset();
  getSessionMock.mockReset();
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
});
