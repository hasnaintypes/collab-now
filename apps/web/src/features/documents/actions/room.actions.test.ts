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
  document: { id: "document.id", workspaceId: "document.workspace_id", roomId: "document.room_id" },
  documentStar: { id: "document_star.id", documentId: "document_star.document_id", userId: "document_star.user_id" },
  documentCollaborator: {},
  workspaceMember: {},
  activityLog: {},
  user: {},
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

const { toggleStarDocument } = await import("./room.actions");

beforeEach(() => {
  dbMock.select.mockReset();
  insertValues.mockClear();
  deleteWhere.mockClear();
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
