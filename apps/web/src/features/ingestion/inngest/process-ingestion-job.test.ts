import { InngestTestEngine } from "@inngest/test";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mirrors the mocking style of workspace.actions.test.ts/rate-limit.test.ts:
// a small hand-rolled Drizzle chain rather than a real DB.
const {
  dbMock,
  updateSet,
  updateWhere,
  insertValues,
  selectLimit,
} = vi.hoisted(() => {
  const updateWhere = vi.fn(() => Promise.resolve(undefined));
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const insertValues = vi.fn(() => Promise.resolve(undefined));
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
  return { dbMock, updateSet, updateWhere, insertValues, selectLimit };
});

vi.mock("@collabnow/db", () => ({
  db: dbMock,
  ingestionJob: { id: "ingestion_job.id" },
  sourceContent: {
    id: "source_content.id",
    ingestionJobId: "source_content.ingestion_job_id",
  },
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
  dbMock.select.mockClear();
  selectLimit.mockReset().mockResolvedValue([]);
  fetchYoutubeTranscriptMock.mockReset();
  fetchArticleMock.mockReset();
  validateYoutubeSourceMock.mockReset();
  validateArticleSourceMock.mockReset();
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
  it("fetches, validates, and persists a YouTube transcript through to \"ready\"", async () => {
    fetchYoutubeTranscriptMock.mockResolvedValueOnce({
      text: "hello world",
      language: "en",
      durationSeconds: 120,
    });
    validateYoutubeSourceMock.mockReturnValueOnce("en");

    const t = new InngestTestEngine({
      function: processIngestionJob,
      events: [youtubeEvent],
    });
    const { result } = await t.execute();

    expect(result).toEqual({ jobId: "job-1", status: "ready", language: "en" });
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
    expect(updateSet).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ status: "processing" })
    );
    expect(updateSet).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: "ready" })
    );
  });

  it("fetches, validates, and persists an article through to \"ready\"", async () => {
    fetchArticleMock.mockResolvedValueOnce({
      title: "A Title",
      text: "article body",
      excerpt: null,
      byline: null,
      siteName: null,
      language: null,
    });
    validateArticleSourceMock.mockReturnValueOnce("en");

    const t = new InngestTestEngine({
      function: processIngestionJob,
      events: [articleEvent],
    });
    const { result } = await t.execute();

    expect(result).toEqual({ jobId: "job-1", status: "ready", language: "en" });
    expect(fetchArticleMock).toHaveBeenCalledWith(articleEvent.data.sourceUrl, {
      maxAttempts: 1,
    });
    expect(fetchYoutubeTranscriptMock).not.toHaveBeenCalled();
  });

  it("skips the insert if source_content already exists for this job (idempotent retry)", async () => {
    selectLimit.mockResolvedValueOnce([{ id: "existing-row" }]);
    fetchYoutubeTranscriptMock.mockResolvedValueOnce({
      text: "hi",
      language: "en",
      durationSeconds: 10,
    });
    validateYoutubeSourceMock.mockReturnValueOnce("en");

    const t = new InngestTestEngine({
      function: processIngestionJob,
      events: [youtubeEvent],
    });
    await t.execute();

    expect(insertValues).not.toHaveBeenCalled();
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
