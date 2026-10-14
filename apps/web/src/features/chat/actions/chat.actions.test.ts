import { describe, expect, it, vi, beforeEach } from "vitest";

// Same mocking style as ingestion.actions.test.ts/room.actions.test.ts/
// workspace.actions.test.ts: mock `@collabnow/db`, `next/headers`, and
// `@/features/auth/lib` rather than hitting a real database.
function selectChain(rows: unknown[]) {
  const builder: {
    from: () => typeof builder;
    where: () => typeof builder;
    orderBy: () => typeof builder;
    limit: () => Promise<unknown[]>;
  } = {} as never;
  builder.from = vi.fn(() => builder);
  builder.where = vi.fn(() => builder);
  builder.orderBy = vi.fn(() => builder);
  builder.limit = vi.fn(() => Promise.resolve(rows));
  return builder;
}

const { dbMock } = vi.hoisted(() => {
  const dbMock = { select: vi.fn() };
  return { dbMock };
});

vi.mock("@collabnow/db", () => ({
  db: dbMock,
  document: {
    id: "document.id",
    roomId: "document.room_id",
    workspaceId: "document.workspace_id",
  },
  documentChunk: {
    documentId: "document_chunk.document_id",
    content: "document_chunk.content",
    embedding: "document_chunk.embedding",
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

const { checkRateLimitMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
  formatRetryAfter: (seconds: number) => `${seconds} seconds`,
  RATE_LIMITS: {
    chatQuery: { name: "chat-query", limit: 20, windowMs: 60 * 60 * 1000 },
  },
}));

const { embedQueryMock } = vi.hoisted(() => ({ embedQueryMock: vi.fn() }));
vi.mock("@/lib/gemini", () => ({ embedQuery: embedQueryMock }));

const { answerQuestionFromChunksMock } = vi.hoisted(() => ({
  answerQuestionFromChunksMock: vi.fn(),
}));
vi.mock("../lib/document-chat", () => ({
  answerQuestionFromChunks: answerQuestionFromChunksMock,
  CHAT_TOP_K: 6,
}));

const { askAboutDocument } = await import("./chat.actions");

beforeEach(() => {
  dbMock.select.mockReset();
  getSessionMock.mockReset();
  checkRateLimitMock
    .mockReset()
    .mockResolvedValue({ success: true, limit: 20, remaining: 19 });
  embedQueryMock.mockReset().mockResolvedValue([0.1, 0.2, 0.3]);
  answerQuestionFromChunksMock.mockReset().mockResolvedValue("the answer");
});

describe("askAboutDocument", () => {
  const params = { roomId: "room-A", question: "What happens at the end?" };

  it("rejects when the caller isn't signed in", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await askAboutDocument(params);

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to use chat.",
    });
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it("rejects a blank question without ever touching the database", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });

    const result = await askAboutDocument({ roomId: "room-A", question: "   " });

    expect(result).toEqual({ success: false, error: "Ask a question first." });
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it("rejects a question over the length limit", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });

    const result = await askAboutDocument({
      roomId: "room-A",
      question: "a".repeat(2001),
    });

    expect(result.success).toBe(false);
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it("rejects when rate limited, surfacing retryAfterSeconds", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    checkRateLimitMock.mockResolvedValueOnce({
      success: false,
      limit: 20,
      remaining: 0,
      retryAfterSeconds: 15,
    });

    const result = await askAboutDocument(params);

    expect(result).toEqual({
      success: false,
      error: "You're asking questions too quickly. Try again in 15 seconds.",
      retryAfterSeconds: 15,
    });
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  it("fails when the document can't be found for that roomId", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(selectChain([]));

    const result = await askAboutDocument(params);

    expect(result).toEqual({
      success: false,
      error: "This document could not be found.",
    });
    expect(embedQueryMock).not.toHaveBeenCalled();
  });

  // ── Isolation (PRD §10 / P2-4 acceptance criteria) ──────────────────
  // "Query as User A, assert User B's chunks never appear in context."

  it("isolation: a signed-in user who isn't a member of the document's workspace is rejected before any chunk retrieval happens", async () => {
    // User B is signed in, but has no membership row in Document A's workspace.
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-B" } });
    dbMock.select
      .mockReturnValueOnce(
        selectChain([{ id: "doc-A", workspaceId: "ws-A" }])
      ) // document lookup for room-A
      .mockReturnValueOnce(selectChain([])); // no membership row for user-B in ws-A

    const result = await askAboutDocument(params);

    expect(result).toEqual({
      success: false,
      error: "You don't have access to this workspace.",
    });
    // The critical assertion: retrieval never ran, so there is no path by
    // which User A's document_chunk rows could have reached User B — not
    // "the wrong rows were filtered out", but "the query never happened".
    expect(dbMock.select).toHaveBeenCalledTimes(2);
    expect(embedQueryMock).not.toHaveBeenCalled();
    expect(answerQuestionFromChunksMock).not.toHaveBeenCalled();
  });

  it("isolation: two authorized users each only ever see their own document's chunks, never mixed", async () => {
    // User A asks about Document A (their own workspace's document).
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-A" } });
    dbMock.select
      .mockReturnValueOnce(selectChain([{ id: "doc-A", workspaceId: "ws-A" }]))
      .mockReturnValueOnce(selectChain([{ id: "member-A" }]))
      .mockReturnValueOnce(
        selectChain([{ content: "Document A's own excerpt" }])
      );

    await askAboutDocument({ roomId: "room-A", question: "q" });

    expect(answerQuestionFromChunksMock).toHaveBeenCalledWith({
      chunks: ["Document A's own excerpt"],
      question: "q",
    });

    answerQuestionFromChunksMock.mockClear();

    // User B asks about a different document (Document B, their own
    // workspace) in a separate call — must only ever see Document B's
    // chunks, never anything from Document A's call above.
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-B" } });
    dbMock.select
      .mockReturnValueOnce(selectChain([{ id: "doc-B", workspaceId: "ws-B" }]))
      .mockReturnValueOnce(selectChain([{ id: "member-B" }]))
      .mockReturnValueOnce(
        selectChain([{ content: "Document B's own excerpt" }])
      );

    await askAboutDocument({ roomId: "room-B", question: "q" });

    expect(answerQuestionFromChunksMock).toHaveBeenCalledTimes(1);
    const { chunks } = answerQuestionFromChunksMock.mock.calls[0]![0] as {
      chunks: string[];
    };
    expect(chunks).toEqual(["Document B's own excerpt"]);
    expect(chunks).not.toContain("Document A's own excerpt");
  });

  it("fails when the document has no indexed chunks yet", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select
      .mockReturnValueOnce(selectChain([{ id: "doc-A", workspaceId: "ws-A" }]))
      .mockReturnValueOnce(selectChain([{ id: "member-1" }]))
      .mockReturnValueOnce(selectChain([])); // no document_chunk rows

    const result = await askAboutDocument(params);

    expect(result).toEqual({
      success: false,
      error:
        "This document doesn't have any indexed source content to chat about yet.",
    });
    expect(answerQuestionFromChunksMock).not.toHaveBeenCalled();
  });

  it("embeds the trimmed question, retrieves chunks, and returns the generated answer", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select
      .mockReturnValueOnce(selectChain([{ id: "doc-A", workspaceId: "ws-A" }]))
      .mockReturnValueOnce(selectChain([{ id: "member-1" }]))
      .mockReturnValueOnce(
        selectChain([{ content: "chunk one" }, { content: "chunk two" }])
      );

    const result = await askAboutDocument({
      roomId: "room-A",
      question: "  What happens at the end?  ",
    });

    expect(embedQueryMock).toHaveBeenCalledWith("What happens at the end?");
    expect(answerQuestionFromChunksMock).toHaveBeenCalledWith({
      chunks: ["chunk one", "chunk two"],
      question: "What happens at the end?",
    });
    expect(result).toEqual({ success: true, data: { answer: "the answer" } });
  });
});
