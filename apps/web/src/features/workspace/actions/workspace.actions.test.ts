import { describe, expect, it, vi, beforeEach } from "vitest";

// `leaveWorkspace` is a good representative action to test here: it
// exercises the "re-derive identity from the session, don't trust the
// caller" guard (see docs/ROADMAP.md P0-6) plus two distinct business-rule
// rejections (`ActionError`s) on top of the success path.
function selectChain(rows: unknown[]) {
  const builder: {
    from: () => typeof builder;
    innerJoin: () => typeof builder;
    where: () => typeof builder;
    orderBy: () => typeof builder;
    limit: () => Promise<unknown[]>;
  } = {} as never;
  builder.from = vi.fn(() => builder);
  builder.innerJoin = vi.fn(() => builder);
  builder.where = vi.fn(() => builder);
  builder.orderBy = vi.fn(() => builder);
  builder.limit = vi.fn(() => Promise.resolve(rows));
  return builder;
}

const { dbMock, deleteWhere, insertValues, getSessionMock } = vi.hoisted(() => {
  const deleteWhere = vi.fn(() => Promise.resolve(undefined));
  const insertValues = vi.fn(() => Promise.resolve(undefined));
  const dbMock = {
    select: vi.fn(),
    delete: vi.fn(() => ({ where: deleteWhere })),
    insert: vi.fn(() => ({ values: insertValues })),
  };
  const getSessionMock = vi.fn();
  return { dbMock, deleteWhere, insertValues, getSessionMock };
});

vi.mock("@collabnow/db", () => ({
  db: dbMock,
  workspace: {},
  workspaceMember: { id: "workspace_member.id", workspaceId: "workspace_member.workspace_id", userId: "workspace_member.user_id", role: "workspace_member.role" },
  workspaceInvite: {},
  activityLog: {
    id: "activity_log.id",
    workspaceId: "activity_log.workspace_id",
    createdAt: "activity_log.created_at",
  },
  user: { id: "user.id", name: "user.name", image: "user.image", email: "user.email" },
}));

vi.mock("@/features/auth/lib", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

const { leaveWorkspace, getRecentActivity } = await import("./workspace.actions");

beforeEach(() => {
  dbMock.select.mockReset();
  deleteWhere.mockClear();
  insertValues.mockClear();
  getSessionMock.mockReset();
});

describe("leaveWorkspace", () => {
  it("rejects when the caller isn't signed in as the target user", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await leaveWorkspace({ workspaceId: "ws-1", userId: "user-1" });

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to leave a workspace.",
    });
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it("rejects when the caller isn't actually a member of the workspace", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(selectChain([])); // no membership row

    const result = await leaveWorkspace({ workspaceId: "ws-1", userId: "user-1" });

    expect(result).toEqual({
      success: false,
      error: "You're not a member of this workspace.",
    });
  });

  it("rejects when the caller is the workspace owner", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(
      selectChain([{ id: "member-1", role: "owner" }])
    );

    const result = await leaveWorkspace({ workspaceId: "ws-1", userId: "user-1" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/owners can't leave/i);
    }
    expect(deleteWhere).not.toHaveBeenCalled();
  });

  it("removes the membership row for a non-owner member", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(
      selectChain([{ id: "member-1", role: "member" }])
    );

    const result = await leaveWorkspace({ workspaceId: "ws-1", userId: "user-1" });

    expect(result).toEqual({ success: true, data: null });
    expect(deleteWhere).toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "ws-1", userId: "user-1", action: "left_workspace" })
    );
  });
});

describe("getRecentActivity", () => {
  const row = (id: string, createdAt: Date) => ({
    id,
    action: "created",
    metadata: null,
    createdAt,
    userName: "Ada",
    userImage: null,
  });

  it("reports no next cursor when a page isn't full", async () => {
    const rows = [row("a1", new Date("2024-01-03")), row("a2", new Date("2024-01-02"))];
    dbMock.select.mockReturnValueOnce(selectChain(rows));

    const result = await getRecentActivity("ws-1", { limit: 20 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activities).toHaveLength(2);
      expect(result.data.nextCursor).toBeNull();
    }
  });

  it("returns a next cursor and trims the lookahead row when there's another page", async () => {
    // Requests `limit + 1` under the hood to detect "is there another page?"
    // without a separate COUNT query — 3 rows back for a limit of 2 means
    // there's more.
    const rows = [
      row("a1", new Date("2024-01-03")),
      row("a2", new Date("2024-01-02")),
      row("a3", new Date("2024-01-01")),
    ];
    dbMock.select.mockReturnValueOnce(selectChain(rows));

    const result = await getRecentActivity("ws-1", { limit: 2 });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activities).toHaveLength(2);
      expect(result.data.activities.map((a) => a.id)).toEqual(["a1", "a2"]);
      expect(result.data.nextCursor).not.toBeNull();
    }
  });
});
