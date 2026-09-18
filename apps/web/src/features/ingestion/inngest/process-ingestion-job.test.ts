import { InngestTestEngine } from "@inngest/test";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mirrors the mocking style of workspace.actions.test.ts/rate-limit.test.ts:
// a small hand-rolled Drizzle chain rather than a real DB.
const {
  dbMock,
  updateSet,
  updateWhere,
  insertValues,
  returningMock,
  selectLimit,
} = vi.hoisted(() => {
  const updateWhere = vi.fn(() => Promise.resolve(undefined));
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const returningMock = vi.fn(() => Promise.resolve([{ id: "doc-1" }]));
  const insertValues = vi.fn(() => ({ returning: returningMock }));
  const selectLimit = vi.fn(() => Promise.resolve([] as unknown[]));
  const dbMock = {
    update: vi.fn(() => ({ set: updateSet })),
    insert: vi.fn(() => ({ values: insertValues })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: selectLimit })),
      })),
    })),
  };
  return { dbMock, updateSet, updateWhere, insertValues, returningMock, selectLimit };
});

vi.mock("@collabnow/db", () => ({
  db: dbMock,
  ingestionJob: { id: "ingestion_job.id" },
  sourceContent: {
    id: "source_content.id",
    ingestionJobId: "source_content.ingestion_job_id",
    generatedNotes: "source_content.generated_notes",
    documentId: "source_content.document_id",
    rawText: "source_content.raw_text",
  },
  document: { id: "document.id", roomId: "document.room_id" },
  documentChunk: {
    id: "document_chunk.id",
    documentId: "document_chunk.document_id",
  },
  activityLog: {},
  user: { id: "user.id", email: "user.email" },
}));

const { createRoomMock } = vi.hoisted(() => ({ createRoomMock: vi.fn() }));
vi.mock("@/lib/liveblocks/client", () => ({
  liveblocks: { createRoom: createRoomMock },
}));

vi.mock("next/cache", () => ({
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

const { fetchYoutubeTranscriptMock } = vi.hoisted(() => ({
  fetchYoutubeTranscriptMock: vi.fn(),
}));
vi.mock("../lib/youtube-transcript", async () => {
  const actual = await vi.importActual<
    typeof import("../lib/youtube-transcript")
  >("../lib/youtube-transcript");
  return { ...actual, fetchYoutubeTranscript: fetchYoutubeTranscriptMock };
});

const { fetchArticleMock } = vi.hoisted(() => ({
  fetchArticleMock: vi.fn(),
}));
vi.mock("../lib/article-extractor", async () => {
  const actual = await vi.importActual<
    typeof import("../lib/article-extractor")
  >("../lib/article-extractor");
  return { ...actual, fetchArticle: fetchArticleMock };
});

const { validateYoutubeSourceMock, validateArticleSourceMock } = vi.hoisted(
  () => ({
    validateYoutubeSourceMock: vi.fn(),
    validateArticleSourceMock: vi.fn(),
  })
);
vi.mock("../lib/source-validator", async () => {
  const actual = await vi.importActual<
    typeof import("../lib/source-validator")
  >("../lib/source-validator");
  return {
    ...actual,
    validateYoutubeSource: validateYoutubeSourceMock,
    validateArticleSource: validateArticleSourceMock,
  };
});

const { generateNotesMock } = vi.hoisted(() => ({
  generateNotesMock: vi.fn(),
}));
vi.mock("../lib/notes-generator", () => ({
  generateNotes: generateNotesMock,
}));

const { embedSourceChunksMock } = vi.hoisted(() => ({
  embedSourceChunksMock: vi.fn(),
}));
vi.mock("../lib/chunk-embedder", () => ({
  embedSourceChunks: embedSourceChunksMock,
}));

const { TranscriptFetchError } = await import("../lib/youtube-transcript");
const { ArticleFetchError } = await import("../lib/article-extractor");
const { SourceValidationError } = await import("../lib/source-validator");
const { processIngestionJob, handleIngestionJobFailure } = await import(
  "./process-ingestion-job"
);

beforeEach(() => {
  dbMock.update.mockClear();
  updateSet.mockClear();
  updateWhere.mockClear();
  dbMock.insert.mockClear();
  insertValues.mockClear();
  returningMock.mockReset().mockResolvedValue([{ id: "doc-1" }]);
  dbMock.select.mockClear();
  selectLimit.mockReset().mockResolvedValue([]);
  fetchYoutubeTranscriptMock.mockReset();
  fetchArticleMock.mockReset();
  validateYoutubeSourceMock.mockReset();
  validateArticleSourceMock.mockReset();
  generateNotesMock.mockReset().mockResolvedValue("generated notes");
  embedSourceChunksMock
    .mockReset()
    .mockResolvedValue([{ content: "chunk one", embedding: [0.1, 0.2] }]);
  createRoomMock.mockReset().mockResolvedValue({ type: "room", id: "room-1" });
});

const youtubeEvent = {
  name: "ingestion/job.requested" as const,
  data: {
    jobId: "job-1",
    sourceUrl: "https://www.youtube.com/watch?v=abc",
    sourceType: "youtube" as const,
    requesterId: "user-1",
    workspaceId: "ws-1",
  },
};

const articleEvent = {
  ...youtubeEvent,
  data: {
    ...youtubeEvent.data,
    sourceType: "article" as const,
    sourceUrl: "https://example.com/post",
  },
};

describe("processIngestionJob", () => {
  it("fetches, validates, and persists a YouTube transcript through to \"ready\", creating a document", async () => {
    fetchYoutubeTranscriptMock.mockResolvedValueOnce({
      text: "hello world",
      language: "en",
      durationSeconds: 120,
    });
    validateYoutubeSourceMock.mockReturnValueOnce("en");
    generateNotesMock.mockResolvedValueOnce("# My Notes\n- point one");
    selectLimit
      .mockResolvedValueOnce([]) // validate-and-persist-source: no existing row
      .mockResolvedValueOnce([]) // generate-notes: no existing notes
      .mockResolvedValueOnce([]) // save-document: no existing linked document
      .mockResolvedValueOnce([{ email: "user1@example.com" }]) // requester lookup
      .mockResolvedValueOnce([
        { documentId: "doc-1", rawText: "hello world" },
      ]) // chunk-and-embed: sourceRow lookup
      .mockResolvedValueOnce([]); // chunk-and-embed: no existing chunks

    const t = new InngestTestEngine({
      function: processIngestionJob,
      events: [youtubeEvent],
    });
    const { result } = await t.execute();

    expect(result).toMatchObject({ jobId: "job-1", status: "ready", language: "en" });
    expect(typeof (result as { roomId: string }).roomId).toBe("string");
    expect(fetchYoutubeTranscriptMock).toHaveBeenCalledWith(
      youtubeEvent.data.sourceUrl,
      { maxAttempts: 1 }
    );
    expect(validateYoutubeSourceMock).toHaveBeenCalledWith({
      text: "hello world",
      language: "en",
      durationSeconds: 120,
    });
    expect(insertValues).toHaveBeenCalledWith({
      ingestionJobId: "job-1",
      rawText: "hello world",
      sourceLanguage: "en",
    });
    expect(generateNotesMock).toHaveBeenCalledWith({
      text: "hello world",
      language: "en",
    });

    // Room created with a title derived from the notes' first heading
    // (YouTube sources have no article title of their own).
    const [roomIdArg, roomOptions] = createRoomMock.mock.calls[0]!;
    expect(roomOptions).toEqual({
      metadata: {
        creatorId: "user-1",
        email: "user1@example.com",
        title: "My Notes",
      },
      usersAccesses: { "user1@example.com": ["room:write"] },
      defaultAccesses: [],
    });
    expect(insertValues).toHaveBeenCalledWith({
      roomId: roomIdArg,
      title: "My Notes",
      creatorId: "user-1",
      workspaceId: "ws-1",
    });
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ documentId: "doc-1" })
    );

    expect(embedSourceChunksMock).toHaveBeenCalledWith("hello world");
    expect(insertValues).toHaveBeenCalledWith([
      { documentId: "doc-1", chunkIndex: 0, content: "chunk one", embedding: [0.1, 0.2] },
    ]);

    expect(updateSet).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ status: "processing" })
    );
    expect(updateSet).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ generatedNotes: "# My Notes\n- point one" })
    );
    expect(updateSet).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ status: "ready" })
    );
  });

  it("fetches, validates, and persists an article through to \"ready\", using the article's own title", async () => {
    fetchArticleMock.mockResolvedValueOnce({
      title: "A Title",
      text: "article body",
      excerpt: null,
      byline: null,
      siteName: null,
      language: null,
    });
    validateArticleSourceMock.mockReturnValueOnce("en");
    selectLimit
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ email: "user1@example.com" }])
      .mockResolvedValueOnce([
        { documentId: "doc-1", rawText: "article body" },
      ])
      .mockResolvedValueOnce([]);

    const t = new InngestTestEngine({
      function: processIngestionJob,
      events: [articleEvent],
    });
    const { result } = await t.execute();

    expect(result).toMatchObject({ jobId: "job-1", status: "ready", language: "en" });
    expect(fetchArticleMock).toHaveBeenCalledWith(articleEvent.data.sourceUrl, {
      maxAttempts: 1,
    });
    expect(fetchYoutubeTranscriptMock).not.toHaveBeenCalled();

    const [, roomOptions] = createRoomMock.mock.calls[0]!;
    expect(roomOptions).toMatchObject({ metadata: { title: "A Title" } });
  });

  it("skips the insert if source_content already exists for this job (idempotent retry)", async () => {
    fetchYoutubeTranscriptMock.mockResolvedValueOnce({
      text: "hi",
      language: "en",
      durationSeconds: 10,
    });
    validateYoutubeSourceMock.mockReturnValueOnce("en");
    selectLimit
      .mockResolvedValueOnce([{ id: "existing-row" }]) // validate-and-persist-source: already inserted
      .mockResolvedValueOnce([]) // generate-notes: no existing notes
      .mockResolvedValueOnce([]) // save-document: no existing linked document
      .mockResolvedValueOnce([{ email: "user1@example.com" }]) // requester lookup
      .mockResolvedValueOnce([{ documentId: "doc-1", rawText: "hi" }]) // chunk-and-embed: sourceRow
      .mockResolvedValueOnce([]); // chunk-and-embed: no existing chunks

    const t = new InngestTestEngine({
      function: processIngestionJob,
      events: [youtubeEvent],
    });
    await t.execute();

    expect(insertValues).not.toHaveBeenCalledWith(
      expect.objectContaining({ rawText: expect.anything() })
    );
  });

  it("skips calling Gemini again if notes were already generated for this job (idempotent retry)", async () => {
    fetchYoutubeTranscriptMock.mockResolvedValueOnce({
      text: "hi",
      language: "en",
      durationSeconds: 10,
    });
    validateYoutubeSourceMock.mockReturnValueOnce("en");
    selectLimit
      .mockResolvedValueOnce([]) // validate-and-persist-source: no existing row
      .mockResolvedValueOnce([{ generatedNotes: "already generated" }]) // generate-notes: already generated
      .mockResolvedValueOnce([]) // save-document: no existing linked document
      .mockResolvedValueOnce([{ email: "user1@example.com" }]) // requester lookup
      .mockResolvedValueOnce([{ documentId: "doc-1", rawText: "hi" }]) // chunk-and-embed: sourceRow
      .mockResolvedValueOnce([]); // chunk-and-embed: no existing chunks

    const t = new InngestTestEngine({
      function: processIngestionJob,
      events: [youtubeEvent],
    });
    await t.execute();

    expect(generateNotesMock).not.toHaveBeenCalled();
    expect(updateSet).not.toHaveBeenCalledWith(
      expect.objectContaining({ generatedNotes: expect.anything() })
    );
  });

  it("propagates a Gemini failure as-is, without wrapping it in NonRetriableError", async () => {
    fetchYoutubeTranscriptMock.mockResolvedValueOnce({
      text: "hi",
      language: "en",
      durationSeconds: 10,
    });
    validateYoutubeSourceMock.mockReturnValueOnce("en");
    generateNotesMock.mockRejectedValueOnce(new Error("Gemini is down"));

    const t = new InngestTestEngine({
      function: processIngestionJob,
      events: [youtubeEvent],
    });
    const generateStep = await t.executeStep("generate-notes");

    expect(generateStep.error).toMatchObject({ message: "Gemini is down" });
    expect(generateStep.error).not.toMatchObject({ name: "NonRetriableError" });
  });

  it("rethrows a transient (\"blocked\") fetch failure so Inngest retries the step", async () => {
    fetchYoutubeTranscriptMock.mockRejectedValueOnce(
      new TranscriptFetchError("rate limited", "blocked")
    );

    const t = new InngestTestEngine({
      function: processIngestionJob,
      events: [youtubeEvent],
    });
    const fetchSource = await t.executeStep("fetch-source");

    expect(fetchSource.error).toMatchObject({ name: "TranscriptFetchError" });
  });

  it("wraps a permanent (\"no-captions\") fetch failure in NonRetriableError", async () => {
    fetchYoutubeTranscriptMock.mockRejectedValueOnce(
      new TranscriptFetchError("no captions", "no-captions")
    );

    const t = new InngestTestEngine({
      function: processIngestionJob,
      events: [youtubeEvent],
    });
    const fetchSource = await t.executeStep("fetch-source");

    expect(fetchSource.error).toMatchObject({ name: "NonRetriableError" });
  });

  it("wraps a permanent article fetch failure (\"extraction-failed\") in NonRetriableError", async () => {
    fetchArticleMock.mockRejectedValueOnce(
      new ArticleFetchError("couldn't extract", "extraction-failed")
    );

    const t = new InngestTestEngine({
      function: processIngestionJob,
      events: [articleEvent],
    });
    const fetchSource = await t.executeStep("fetch-source");

    expect(fetchSource.error).toMatchObject({ name: "NonRetriableError" });
  });

  it("wraps a validation failure in NonRetriableError without persisting anything", async () => {
    fetchYoutubeTranscriptMock.mockResolvedValueOnce({
      text: "hi",
      language: "en",
      durationSeconds: 10,
    });
    validateYoutubeSourceMock.mockImplementationOnce(() => {
      throw new SourceValidationError("too long", "video-too-long");
    });

    const t = new InngestTestEngine({
      function: processIngestionJob,
      events: [youtubeEvent],
    });
    const validateStep = await t.executeStep("validate-and-persist-source");

    expect(validateStep.error).toMatchObject({ name: "NonRetriableError" });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("skips creating a second room/document if this job's source_content is already linked (idempotent retry)", async () => {
    fetchYoutubeTranscriptMock.mockResolvedValueOnce({
      text: "hi",
      language: "en",
      durationSeconds: 10,
    });
    validateYoutubeSourceMock.mockReturnValueOnce("en");
    selectLimit
      .mockResolvedValueOnce([]) // validate-and-persist-source
      .mockResolvedValueOnce([]) // generate-notes
      .mockResolvedValueOnce([{ documentId: "doc-1" }]) // save-document: already linked
      .mockResolvedValueOnce([{ roomId: "existing-room-1" }]) // document lookup by id
      .mockResolvedValueOnce([{ documentId: "doc-1", rawText: "hi" }]) // chunk-and-embed: sourceRow
      .mockResolvedValueOnce([{ id: "chunk-1" }]); // chunk-and-embed: already chunked

    const t = new InngestTestEngine({
      function: processIngestionJob,
      events: [youtubeEvent],
    });
    const { result } = await t.execute();

    expect(result).toMatchObject({ roomId: "existing-room-1" });
    expect(createRoomMock).not.toHaveBeenCalled();
    expect(insertValues).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.anything() })
    );
    expect(embedSourceChunksMock).not.toHaveBeenCalled();
  });

  it("fails without retrying if the requesting user no longer exists", async () => {
    fetchYoutubeTranscriptMock.mockResolvedValueOnce({
      text: "hi",
      language: "en",
      durationSeconds: 10,
    });
    validateYoutubeSourceMock.mockReturnValueOnce("en");
    selectLimit
      .mockResolvedValueOnce([]) // validate-and-persist-source
      .mockResolvedValueOnce([]) // generate-notes
      .mockResolvedValueOnce([]) // save-document: no existing linked document
      .mockResolvedValueOnce([]); // requester lookup: not found

    const t = new InngestTestEngine({
      function: processIngestionJob,
      events: [youtubeEvent],
    });
    const saveStep = await t.executeStep("save-document");

    expect(saveStep.error).toMatchObject({ name: "NonRetriableError" });
    expect(createRoomMock).not.toHaveBeenCalled();
  });
  it("propagates an embedding failure as-is, without wrapping it in NonRetriableError", async () => {
    fetchYoutubeTranscriptMock.mockResolvedValueOnce({
      text: "hi",
      language: "en",
      durationSeconds: 10,
    });
    validateYoutubeSourceMock.mockReturnValueOnce("en");
    selectLimit
      .mockResolvedValueOnce([]) // validate-and-persist-source
      .mockResolvedValueOnce([]) // generate-notes
      .mockResolvedValueOnce([]) // save-document: no existing linked document
      .mockResolvedValueOnce([{ email: "user1@example.com" }]) // requester lookup
      .mockResolvedValueOnce([{ documentId: "doc-1", rawText: "hi" }]) // chunk-and-embed: sourceRow
      .mockResolvedValueOnce([]); // chunk-and-embed: no existing chunks
    embedSourceChunksMock.mockRejectedValueOnce(
      new Error("Gemini embedding is down")
    );

    const t = new InngestTestEngine({
      function: processIngestionJob,
      events: [youtubeEvent],
    });
    const { error } = await t.execute();

    expect(error).toMatchObject({ message: "Gemini embedding is down" });
    expect(error).not.toMatchObject({ name: "NonRetriableError" });
  });

  it("does nothing if source_content unexpectedly has no documentId yet", async () => {
    fetchYoutubeTranscriptMock.mockResolvedValueOnce({
      text: "hi",
      language: "en",
      durationSeconds: 10,
    });
    validateYoutubeSourceMock.mockReturnValueOnce("en");
    selectLimit
      .mockResolvedValueOnce([]) // validate-and-persist-source
      .mockResolvedValueOnce([]) // generate-notes
      .mockResolvedValueOnce([]) // save-document: no existing linked document
      .mockResolvedValueOnce([{ email: "user1@example.com" }]) // requester lookup
      .mockResolvedValueOnce([]); // chunk-and-embed: sourceRow lookup finds nothing

    const t = new InngestTestEngine({
      function: processIngestionJob,
      events: [youtubeEvent],
    });
    const { result } = await t.execute();

    expect(result).toMatchObject({ status: "ready" });
    expect(embedSourceChunksMock).not.toHaveBeenCalled();
  });
});

describe("handleIngestionJobFailure", () => {
  it("marks the job failed with the error's message", async () => {
    await handleIngestionJobFailure({
      event: { data: { event: { data: { jobId: "job-1" } } } },
      error: new Error("boom"),
    });

    expect(dbMock.update).toHaveBeenCalledTimes(1);
    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed", errorMessage: "boom" })
    );
    expect(updateWhere).toHaveBeenCalledTimes(1);
  });

  it("falls back to a generic message when the error has none", async () => {
    await handleIngestionJobFailure({
      event: { data: { event: { data: { jobId: "job-1" } } } },
      error: Object.assign(new Error(), { message: "" }),
    });

    expect(updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        errorMessage: "Ingestion failed unexpectedly.",
      })
    );
  });
});
