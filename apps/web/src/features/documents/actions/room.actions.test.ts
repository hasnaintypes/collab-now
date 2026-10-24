import { describe, expect, it, vi, beforeEach } from "vitest";

// `toggleStarDocument` is a good representative server action to unit test:
// it's a full round trip through `safeAction`, Drizzle's query builder, and
// the app's cache-invalidation helpers, without needing Liveblocks, auth
// sessions, or email — those are exercised by the other actions in this
// file but aren't relevant to this particular action's behavior.
function selectChain(rows: unknown[]) {
  const builder: { from: () => typeof builder; where: () => typeof builder; limit: () => Promise<unknown[]> } =
    {} as never;
  builder.from = vi.fn(() => builder);
  builder.where = vi.fn(() => builder);
  builder.limit = vi.fn(() => Promise.resolve(rows));
  return builder;
}

// `countUserDocuments` (backing `createDocument`'s doc-limit check) ends at
// `.where()` directly, no `.limit()` — it destructures a single-row count
// result straight off the awaited query builder.
function countChain(total: number) {
  const builder: { from: () => typeof builder; leftJoin: () => typeof builder; where: () => Promise<unknown[]> } =
    {} as never;
  builder.from = vi.fn(() => builder);
  builder.leftJoin = vi.fn(() => builder);
  builder.where = vi.fn(() => Promise.resolve([{ count: total }]));
  return builder;
}

const { dbMock, insertValues, deleteWhere } = vi.hoisted(() => {
  const insertValues = vi.fn(() => Promise.resolve(undefined));
  const deleteWhere = vi.fn(() => Promise.resolve(undefined));
  const dbMock = {
    select: vi.fn(),
    insert: vi.fn(() => ({ values: insertValues })),
    delete: vi.fn(() => ({ where: deleteWhere })),
  };
  return { dbMock, insertValues, deleteWhere };
});

vi.mock("@collabnow/db", () => ({
  db: dbMock,
  document: { id: "document.id", workspaceId: "document.workspace_id", roomId: "document.room_id", creatorId: "document.creator_id" },
  documentStar: { id: "document_star.id", documentId: "document_star.document_id", userId: "document_star.user_id" },
  documentCollaborator: { id: "document_collaborator.id", documentId: "document_collaborator.document_id", userId: "document_collaborator.user_id" },
  workspaceMember: {},
  activityLog: {},
  user: {},
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock("@/features/auth/lib", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

const { createRoomMock } = vi.hoisted(() => ({ createRoomMock: vi.fn() }));
vi.mock("@/lib/liveblocks", () => ({
  liveblocks: { createRoom: createRoomMock },
  getAccessType: vi.fn(),
}));

const { checkRateLimitMock } = vi.hoisted(() => ({ checkRateLimitMock: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
  formatRetryAfter: (seconds: number) => `${seconds} seconds`,
  RATE_LIMITS: {
    documentCreate: { name: "document-create", limit: 20, windowMs: 10 * 60 * 1000 },
    documentShare: { name: "document-share", limit: 30, windowMs: 60 * 60 * 1000 },
  },
}));

const { toggleStarDocument, createDocument } = await import("./room.actions");

beforeEach(() => {
  dbMock.select.mockReset();
  insertValues.mockClear();
  deleteWhere.mockClear();
  getSessionMock.mockReset();
  createRoomMock.mockReset();
  checkRateLimitMock
    .mockReset()
    .mockResolvedValue({ success: true, limit: 20, remaining: 19 });
});

describe("toggleStarDocument", () => {
  it("stars a previously-unstarred document", async () => {
    dbMock.select
      .mockReturnValueOnce(selectChain([{ id: "doc-1", workspaceId: "ws-1" }]))
      .mockReturnValueOnce(selectChain([])); // no existing star row

    const result = await toggleStarDocument("room-1", "user-1");

    expect(result).toEqual({ success: true, data: { starred: true } });
    expect(insertValues).toHaveBeenCalledWith({ documentId: "doc-1", userId: "user-1" });
    expect(deleteWhere).not.toHaveBeenCalled();
  });

  it("unstars an already-starred document", async () => {
    dbMock.select
      .mockReturnValueOnce(selectChain([{ id: "doc-1", workspaceId: "ws-1" }]))
      .mockReturnValueOnce(selectChain([{ id: "star-1" }])); // existing star row

    const result = await toggleStarDocument("room-1", "user-1");

    expect(result).toEqual({ success: true, data: { starred: false } });
    expect(deleteWhere).toHaveBeenCalled();
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("fails gracefully when the document doesn't exist", async () => {
    dbMock.select.mockReturnValueOnce(selectChain([])); // no matching document

    const result = await toggleStarDocument("missing-room", "user-1");

    expect(result).toEqual({ success: false, error: "Document not found." });
    expect(insertValues).not.toHaveBeenCalled();
    expect(deleteWhere).not.toHaveBeenCalled();
  });
});

describe("createDocument", () => {
  const params = { userId: "user-1", email: "user@example.com" };

  it("rejects when the caller isn't signed in", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await createDocument(params);

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to create a document.",
    });
    expect(createRoomMock).not.toHaveBeenCalled();
  });

  it("rejects when the doc limit is already reached", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(countChain(50));

    const result = await createDocument(params);

    expect(result).toEqual({
      success: false,
      error: "Document limit reached. You can have up to 50 documents.",
    });
    expect(createRoomMock).not.toHaveBeenCalled();
  });

  it("creates a blank document when no templateId is given", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(countChain(0));
    createRoomMock.mockResolvedValueOnce({
      id: "room-1",
      metadata: { creatorId: "user-1", email: params.email, title: "Untitled document" },
      usersAccesses: {},
    });

    const result = await createDocument(params);

    expect(result.success).toBe(true);
    const [, options] = createRoomMock.mock.calls[0]!;
    expect(options.metadata).not.toHaveProperty("templateId");
  });

  it("stores a valid templateId in the room's metadata", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(countChain(0));
    createRoomMock.mockResolvedValueOnce({
      id: "room-1",
      metadata: {
        creatorId: "user-1",
        email: params.email,
        title: "Untitled document",
        templateId: "meeting-notes",
      },
      usersAccesses: {},
    });

    await createDocument({ ...params, templateId: "meeting-notes" });

    const [, options] = createRoomMock.mock.calls[0]!;
    expect(options.metadata).toMatchObject({ templateId: "meeting-notes" });
  });

  it("silently drops an unrecognized templateId rather than storing it", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(countChain(0));
    createRoomMock.mockResolvedValueOnce({
      id: "room-1",
      metadata: { creatorId: "user-1", email: params.email, title: "Untitled document" },
      usersAccesses: {},
    });

    await createDocument({ ...params, templateId: "not-a-real-template" });

    const [, options] = createRoomMock.mock.calls[0]!;
    expect(options.metadata).not.toHaveProperty("templateId");
  });
});
