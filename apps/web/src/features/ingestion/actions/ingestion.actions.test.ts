import { describe, expect, it, vi, beforeEach } from "vitest";

// `enqueueIngestionJob`/`getIngestionJobStatus` exercise the standard
// session-check + rate-limit + `ActionResult`/`safeAction` conventions
// (see room.actions.test.ts/workspace.actions.test.ts for the established
// mocking style this follows).
function selectChain(rows: unknown[]) {
  const builder: {
    from: () => typeof builder;
    leftJoin: () => typeof builder;
    innerJoin: () => typeof builder;
    where: () => typeof builder;
    limit: () => Promise<unknown[]>;
  } = {} as never;
  builder.from = vi.fn(() => builder);
  builder.leftJoin = vi.fn(() => builder);
  builder.innerJoin = vi.fn(() => builder);
  builder.where = vi.fn(() => builder);
  builder.limit = vi.fn(() => Promise.resolve(rows));
  return builder;
}

const { dbMock, insertValues, updateSet, updateWhere } = vi.hoisted(() => {
  const insertValues = vi.fn(() => Promise.resolve(undefined));
  const updateWhere = vi.fn(() => Promise.resolve(undefined));
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const dbMock = {
    select: vi.fn(),
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: updateSet })),
  };
  return { dbMock, insertValues, updateSet, updateWhere };
});

vi.mock("@collabnow/db", () => ({
  db: dbMock,
  ingestionJob: {
    id: "ingestion_job.id",
    workspaceId: "ingestion_job.workspace_id",
  },
  sourceContent: {
    id: "source_content.id",
    ingestionJobId: "source_content.ingestion_job_id",
    documentId: "source_content.document_id",
    rawText: "source_content.raw_text",
    sourceLanguage: "source_content.source_language",
    generatedNotes: "source_content.generated_notes",
    noteStyle: "source_content.note_style",
  },
  document: {
    id: "document.id",
    roomId: "document.room_id",
    workspaceId: "document.workspace_id",
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
    ingestionSubmit: {
      name: "ingestion-submit",
      limit: 10,
      windowMs: 60 * 60 * 1000,
    },
    notesRegenerate: {
      name: "notes-regenerate",
      limit: 20,
      windowMs: 60 * 60 * 1000,
    },
  },
}));

const { inngestSendMock } = vi.hoisted(() => ({ inngestSendMock: vi.fn() }));
vi.mock("@/lib/inngest/client", () => ({
  inngest: { send: inngestSendMock },
}));

const { generateNotesMock } = vi.hoisted(() => ({
  generateNotesMock: vi.fn(),
}));
vi.mock("../lib/notes-generator", () => ({
  generateNotes: generateNotesMock,
  NOTE_STYLE_LABELS: {
    "bullet-outline": "Bullet / Outline Summary",
    cornell: "Cornell Notes",
    mindmap: "Mind-Map Outline",
    "qa-flashcards": "Q&A / Flashcards",
    "executive-summary": "Executive Summary (TL;DR)",
  },
}));

const {
  enqueueIngestionJob,
  getIngestionJobStatus,
  getGeneratedNotesForDocument,
  regenerateNotes,
} = await import("./ingestion.actions");

beforeEach(() => {
  dbMock.select.mockReset();
  insertValues.mockClear();
  updateSet.mockClear();
  updateWhere.mockClear();
  getSessionMock.mockReset();
  checkRateLimitMock
    .mockReset()
    .mockResolvedValue({ success: true, limit: 10, remaining: 9 });
  inngestSendMock.mockReset().mockResolvedValue(undefined);
  generateNotesMock.mockReset().mockResolvedValue("regenerated notes");
});

describe("enqueueIngestionJob", () => {
  const params = {
    workspaceId: "ws-1",
    sourceUrl: "https://www.youtube.com/watch?v=abc",
  };

  it("rejects when the caller isn't signed in", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await enqueueIngestionJob(params);

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to submit a URL.",
    });
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it("rejects when rate limited, surfacing retryAfterSeconds", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    checkRateLimitMock.mockResolvedValueOnce({
      success: false,
      limit: 10,
      remaining: 0,
      retryAfterSeconds: 42,
    });

    const result = await enqueueIngestionJob(params);

    expect(result).toEqual({
      success: false,
      error: "You're submitting content too quickly. Try again in 42 seconds.",
      retryAfterSeconds: 42,
    });
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it("rejects a URL it can't classify as YouTube or an article", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });

    const result = await enqueueIngestionJob({
      workspaceId: "ws-1",
      sourceUrl: "not-a-url",
    });

    expect(result).toEqual({
      success: false,
      error: "That doesn't look like a valid YouTube or article URL.",
    });
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it("rejects when the caller isn't a member of the workspace", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(selectChain([])); // no membership row

    const result = await enqueueIngestionJob(params);

    expect(result).toEqual({
      success: false,
      error: "You don't have access to this workspace.",
    });
    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  it("inserts a queued job, sends the Inngest event, and returns the job id", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(selectChain([{ id: "member-1" }]));

    const result = await enqueueIngestionJob(params);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.jobId).toBe("string");
      expect(result.data.jobId.length).toBeGreaterThan(0);
    }
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceUrl: params.sourceUrl,
        sourceType: "youtube",
        requesterId: "user-1",
        workspaceId: "ws-1",
        status: "queued",
      })
    );
    expect(inngestSendMock).toHaveBeenCalledTimes(1);
  });

  it("marks the job failed instead of leaving it stuck queued when sending the event fails", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(selectChain([{ id: "member-1" }]));
    inngestSendMock.mockRejectedValueOnce(new Error("network error"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = await enqueueIngestionJob(params);

    expect(result).toEqual({
      success: false,
      error: "Failed to queue this job. Please try again.",
    });
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" })
    );
    consoleError.mockRestore();
  });
});

describe("getIngestionJobStatus", () => {
  it("rejects when the caller isn't signed in", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await getIngestionJobStatus({ jobId: "job-1" });

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to view job status.",
    });
  });

  it("fails when the job doesn't exist", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(selectChain([]));

    const result = await getIngestionJobStatus({ jobId: "missing" });

    expect(result).toEqual({
      success: false,
      error: "That job could not be found.",
    });
  });

  it("fails when the caller isn't a member of the job's workspace", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select
      .mockReturnValueOnce(
        selectChain([
          {
            id: "job-1",
            workspaceId: "ws-1",
            status: "queued",
            sourceType: "youtube",
            sourceUrl: "url",
            errorMessage: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            roomId: null,
          },
        ])
      )
      .mockReturnValueOnce(selectChain([])); // no membership row

    const result = await getIngestionJobStatus({ jobId: "job-1" });

    expect(result).toEqual({
      success: false,
      error: "You don't have access to this workspace.",
    });
  });

  it("returns the job status for a workspace member, with roomId null before a document exists", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    const timestamp = new Date("2024-01-01T00:00:00.000Z");
    dbMock.select
      .mockReturnValueOnce(
        selectChain([
          {
            id: "job-1",
            workspaceId: "ws-1",
            status: "processing",
            sourceType: "youtube",
            sourceUrl: "url",
            errorMessage: null,
            createdAt: timestamp,
            updatedAt: timestamp,
            roomId: null,
          },
        ])
      )
      .mockReturnValueOnce(selectChain([{ id: "member-1" }]));

    const result = await getIngestionJobStatus({ jobId: "job-1" });

    expect(result).toEqual({
      success: true,
      data: {
        id: "job-1",
        status: "processing",
        sourceType: "youtube",
        sourceUrl: "url",
        errorMessage: null,
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
        roomId: null,
      },
    });
  });

  it("returns roomId once the job is ready and linked to a document", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    const timestamp = new Date("2024-01-01T00:00:00.000Z");
    dbMock.select
      .mockReturnValueOnce(
        selectChain([
          {
            id: "job-1",
            workspaceId: "ws-1",
            status: "ready",
            sourceType: "youtube",
            sourceUrl: "url",
            errorMessage: null,
            createdAt: timestamp,
            updatedAt: timestamp,
            roomId: "room-1",
          },
        ])
      )
      .mockReturnValueOnce(selectChain([{ id: "member-1" }]));

    const result = await getIngestionJobStatus({ jobId: "job-1" });

    expect(result).toEqual({
      success: true,
      data: {
        id: "job-1",
        status: "ready",
        sourceType: "youtube",
        sourceUrl: "url",
        errorMessage: null,
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
        roomId: "room-1",
      },
    });
  });
});

describe("getGeneratedNotesForDocument", () => {
  it("rejects when the caller isn't signed in", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await getGeneratedNotesForDocument({ roomId: "room-1" });

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to view this document.",
    });
  });

  it("returns null for a document with no linked source_content (manually created)", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(selectChain([])); // inner join finds nothing

    const result = await getGeneratedNotesForDocument({ roomId: "room-1" });

    expect(result).toEqual({ success: true, data: null });
  });

  it("returns null while notes haven't finished generating yet", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(
      selectChain([{ workspaceId: "ws-1", generatedNotes: null }])
    );

    const result = await getGeneratedNotesForDocument({ roomId: "room-1" });

    expect(result).toEqual({ success: true, data: null });
  });

  it("rejects when the caller isn't a member of the document's workspace", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select
      .mockReturnValueOnce(
        selectChain([{ workspaceId: "ws-1", generatedNotes: "# Notes" }])
      )
      .mockReturnValueOnce(selectChain([])); // no membership row

    const result = await getGeneratedNotesForDocument({ roomId: "room-1" });

    expect(result).toEqual({
      success: false,
      error: "You don't have access to this workspace.",
    });
  });

  it("returns the generated notes and style for a workspace member", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select
      .mockReturnValueOnce(
        selectChain([
          {
            workspaceId: "ws-1",
            generatedNotes: "# Notes\n- a",
            noteStyle: "cornell",
          },
        ])
      )
      .mockReturnValueOnce(selectChain([{ id: "member-1" }]));

    const result = await getGeneratedNotesForDocument({ roomId: "room-1" });

    expect(result).toEqual({
      success: true,
      data: { notes: "# Notes\n- a", noteStyle: "cornell" },
    });
  });
});

describe("regenerateNotes", () => {
  const params = { roomId: "room-1", style: "cornell" as const };

  it("rejects when the caller isn't signed in", async () => {
    getSessionMock.mockResolvedValueOnce(null);

    const result = await regenerateNotes(params);

    expect(result).toEqual({
      success: false,
      error: "You must be signed in to regenerate notes.",
    });
    expect(generateNotesMock).not.toHaveBeenCalled();
  });

  it("rejects a style this app doesn't support", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });

    const result = await regenerateNotes({
      roomId: "room-1",
      style: "haiku" as never,
    });

    expect(result).toEqual({
      success: false,
      error: "That's not a note style this app supports.",
    });
    expect(generateNotesMock).not.toHaveBeenCalled();
  });

  it("rejects when rate limited, surfacing retryAfterSeconds", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    checkRateLimitMock.mockResolvedValueOnce({
      success: false,
      limit: 20,
      remaining: 0,
      retryAfterSeconds: 30,
    });

    const result = await regenerateNotes(params);

    expect(result).toEqual({
      success: false,
      error: "You're regenerating notes too quickly. Try again in 30 seconds.",
      retryAfterSeconds: 30,
    });
    expect(generateNotesMock).not.toHaveBeenCalled();
  });

  it("fails when the document has no source content to regenerate from", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select.mockReturnValueOnce(selectChain([])); // inner join finds nothing

    const result = await regenerateNotes(params);

    expect(result).toEqual({
      success: false,
      error:
        "This document doesn't have any source content to regenerate notes from.",
    });
    expect(generateNotesMock).not.toHaveBeenCalled();
  });

  it("rejects when the caller isn't a member of the document's workspace", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select
      .mockReturnValueOnce(
        selectChain([
          {
            id: "sc-1",
            workspaceId: "ws-1",
            rawText: "raw text",
            sourceLanguage: "en",
          },
        ])
      )
      .mockReturnValueOnce(selectChain([])); // no membership row

    const result = await regenerateNotes(params);

    expect(result).toEqual({
      success: false,
      error: "You don't have access to this workspace.",
    });
    expect(generateNotesMock).not.toHaveBeenCalled();
  });

  it("regenerates from the already-stored source text and persists the new style, without re-fetching anything", async () => {
    getSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    dbMock.select
      .mockReturnValueOnce(
        selectChain([
          {
            id: "sc-1",
            workspaceId: "ws-1",
            rawText: "raw text",
            sourceLanguage: "en",
          },
        ])
      )
      .mockReturnValueOnce(selectChain([{ id: "member-1" }]));

    const result = await regenerateNotes(params);

    expect(result).toEqual({ success: true, data: { notes: "regenerated notes" } });
    expect(generateNotesMock).toHaveBeenCalledWith({
      text: "raw text",
      language: "en",
      style: "cornell",
    });
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        generatedNotes: "regenerated notes",
        noteStyle: "cornell",
      })
    );
  });
});
