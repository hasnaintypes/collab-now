import { NonRetriableError } from "inngest";
import { eq } from "drizzle-orm";
import { db, ingestionJob, sourceContent } from "@collabnow/db";

import { inngest } from "@/lib/inngest/client";
import { ingestionJobRequested } from "./events";
import {
  fetchYoutubeTranscript,
  TranscriptFetchError,
  type YoutubeTranscriptResult,
} from "../lib/youtube-transcript";
import {
  fetchArticle,
  ArticleFetchError,
  type ArticleExtractionResult,
} from "../lib/article-extractor";
import {
  validateYoutubeSource,
  validateArticleSource,
  SourceValidationError,
} from "../lib/source-validator";
import type { SourceType } from "../lib/source-detector";

/**
 * Real ingestion pipeline (P1-5) — wires P1-2 (YouTube)/P1-3 (article)
 * fetching and P1-4 validation into the P0-16 Inngest queue. Triggered by
 * `ingestionJobRequested`, sent by `enqueueIngestionJob`
 * (`features/ingestion/actions/ingestion.actions.ts`) right after it
 * inserts the `ingestion_job` row (status "queued"), so the caller already
 * has a job id before this function even starts running (FR-7).
 *
 * Scope note: this function's last step marks the job "ready" once the
 * source text is fetched, validated, and persisted to `source_content` —
 * that's as far as P1-5 goes. Notes generation (P1-6) and saving a
 * `document` (P1-7) are separate, later issues that will extend this same
 * function with more steps *before* that final status flip, rather than
 * replacing it — Inngest's step memoization means already-completed steps
 * replay instantly on a later run, so growing the function over time is the
 * intended shape, not a rewrite.
 *
 * Retry strategy: `fetchYoutubeTranscript`/`fetchArticle` are called with
 * `maxAttempts: 1`, disabling their own internal sleep-based backoff —
 * Inngest's own `retries` + platform-level backoff owns that instead (see
 * docs/DECISIONS.md's rationale for choosing Inngest). A transient failure
 * (`reason: "blocked" | "unknown"`) is rethrown as-is so Inngest retries the
 * step; anything else (a permanent/business failure — bad URL, no
 * captions, paywalled page, over a cap, unsupported language) is wrapped in
 * `NonRetriableError` so Inngest gives up immediately instead of retrying a
 * failure that will never succeed.
 */
/**
 * Runs once Inngest gives up on a run — either every retry was exhausted,
 * or a `NonRetriableError` was thrown from one of the steps below. Kept as
 * its own function (rather than an inline closure) both for direct unit
 * testing and so the business steps don't each need their own
 * failure-recording logic — this is the one place a permanent failure gets
 * written to the DB.
 */
export async function handleIngestionJobFailure({
  event,
  error,
}: {
  event: { data: { event: { data: { jobId: string } } } };
  error: Error;
}): Promise<void> {
  const { jobId } = event.data.event.data;

  await db
    .update(ingestionJob)
    .set({
      status: "failed",
      errorMessage: error.message || "Ingestion failed unexpectedly.",
      updatedAt: new Date(),
    })
    .where(eq(ingestionJob.id, jobId));
}

export const processIngestionJob = inngest.createFunction(
  {
    id: "process-ingestion-job",
    retries: 4,
    triggers: [ingestionJobRequested],
    onFailure: handleIngestionJobFailure,
  },
  async ({ event, step }) => {
    const { jobId, sourceUrl, sourceType } = event.data;

    await step.run("mark-processing", async () => {
      await db
        .update(ingestionJob)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(ingestionJob.id, jobId));
    });

    const source = await step.run("fetch-source", async () => {
      try {
        return sourceType === "youtube"
          ? await fetchYoutubeTranscript(sourceUrl, { maxAttempts: 1 })
          : await fetchArticle(sourceUrl, { maxAttempts: 1 });
      } catch (error) {
        if (
          error instanceof TranscriptFetchError ||
          error instanceof ArticleFetchError
        ) {
          if (error.reason === "blocked" || error.reason === "unknown") {
            // Transient — rethrow as-is so Inngest's own `retries`/backoff
            // re-runs this step.
            throw error;
          }
          // Permanent/business failure (bad URL, no captions, paywalled
          // page, etc.) — will never succeed no matter how many times it's
          // retried.
          throw new NonRetriableError(error.message);
        }
        throw error;
      }
    });

    const language = await step.run(
      "validate-and-persist-source",
      async () => {
        let language: string;
        try {
          language = isYoutubeSource(sourceType, source)
            ? validateYoutubeSource(source)
            : validateArticleSource(source);
        } catch (error) {
          if (error instanceof SourceValidationError) {
            // Always permanent — a source that's too long/wrong-language
            // doesn't become valid on retry.
            throw new NonRetriableError(error.message);
          }
          throw error;
        }

        // Idempotent: if a previous attempt at this step got as far as
        // inserting the row before something after it failed, a retry
        // shouldn't insert a second row and trip the unique index on
        // `ingestionJobId`.
        const [existing] = await db
          .select({ id: sourceContent.id })
          .from(sourceContent)
          .where(eq(sourceContent.ingestionJobId, jobId))
          .limit(1);

        if (!existing) {
          await db.insert(sourceContent).values({
            ingestionJobId: jobId,
            rawText: source.text,
            sourceLanguage: language,
          });
        }

        return language;
      }
    );

    await step.run("mark-ready", async () => {
      await db
        .update(ingestionJob)
        .set({ status: "ready", updatedAt: new Date() })
        .where(eq(ingestionJob.id, jobId));
    });

    return { jobId, status: "ready" as const, language };
  }
);

function isYoutubeSource(
  sourceType: SourceType,
  source: YoutubeTranscriptResult | ArticleExtractionResult
): source is YoutubeTranscriptResult {
  return sourceType === "youtube";
}
