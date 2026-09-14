import { eventType, Inngest, staticSchema } from "inngest";

/**
 * Serverless-native background job runtime (P0-16). Replaces the
 * "Postgres job table + polling worker" option from docs/ROADMAP.md P0-16:
 * a self-hosted polling worker needs a long-running process, which this
 * Vercel-deployed Next.js app has nowhere to run. Inngest instead delivers
 * events via HTTP to a single route (`app/api/inngest/route.ts`), executes
 * each function as durable, individually-retried "steps," and gives every
 * run automatic exponential-backoff retries — see docs/DECISIONS.md for the
 * full rationale.
 *
 * `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` are only required once this
 * app is registered against the hosted Inngest dashboard for a deployed
 * environment; local development works against `npx inngest-cli@latest dev`
 * with no keys at all (see README.md).
 *
 * Not wired to any feature yet — `functions.ts` only contains the no-op
 * scaffold job proving the pipeline end-to-end. Real ingestion jobs land in
 * Phase 1 (P1-5, depends on this issue).
 */
/**
 * Scaffold-only event for P0-16's acceptance criteria: proves a job can be
 * enqueued, transition through processing steps, and complete (or fail and
 * retry with backoff) end to end, without any real ingestion logic.
 */
type NoopTestJobRequested = {
  jobId: string;
  input?: string;
  /** Throws a retriable error on every attempt, to exercise backoff. */
  simulateFailure?: boolean;
  /** Throws a `NonRetriableError` — job fails immediately, no retries. */
  simulateNonRetriableFailure?: boolean;
};

export const noopTestJobRequested = eventType("test/noop.requested", {
  schema: staticSchema<NoopTestJobRequested>(),
});

export const inngest = new Inngest({ id: "collabnow" });
