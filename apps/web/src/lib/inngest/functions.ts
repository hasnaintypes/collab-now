import { NonRetriableError } from "inngest";

import { inngest, noopTestJobRequested } from "./client";

/**
 * No-op scaffold job for P0-16. Mirrors the shape a real ingestion job will
 * have (P1-5): queued -> processing -> ready, or queued -> processing ->
 * failed. Each `step.run` is durably checkpointed by Inngest — if the
 * function crashes/retries after "mark-processing" has already run, that
 * step is not re-executed, only the ones after it.
 *
 * Retry/backoff (PRD §10 Reliability): `retries: 4` gives each run up to 4
 * additional attempts on a *retriable* thrown error, spaced out by
 * Inngest's built-in exponential backoff — no custom retry loop to write.
 * Throwing `NonRetriableError` instead (see `simulateNonRetriableFailure`
 * below) fails the run immediately with no further attempts, for the
 * "fail cleanly, don't hang, when upstream is blocked" case from the PRD.
 */
export const noopIngestionTestJob = inngest.createFunction(
  {
    id: "noop-ingestion-test-job",
    retries: 4,
    triggers: [noopTestJobRequested],
  },
  async ({ event, step }) => {
    const { jobId, input, simulateFailure, simulateNonRetriableFailure } =
      event.data;

    await step.run("mark-processing", async () => {
      return { jobId, status: "processing" as const };
    });

    const work = await step.run("do-work", async () => {
      if (simulateNonRetriableFailure) {
        throw new NonRetriableError(
          `Job ${jobId} hit a permanent failure (e.g. blocked/unsupported source) — no retries.`
        );
      }
      if (simulateFailure) {
        throw new Error(
          `Job ${jobId} hit a transient failure — Inngest will retry with backoff.`
        );
      }
      // Real ingestion work (P1-5) — fetch transcript/article, call Gemini,
      // save a document — replaces this placeholder.
      return { echoedInput: input ?? null };
    });

    return await step.run("mark-ready", async () => {
      return { jobId, status: "ready" as const, result: work };
    });
  }
);
