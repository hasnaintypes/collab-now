import { eventType, staticSchema } from "inngest";
import type { SourceType } from "../lib/source-detector";

/**
 * Triggering event for the real ingestion pipeline (P1-5), sent by
 * `enqueueIngestionJob` (`features/ingestion/actions/ingestion.actions.ts`)
 * once the `ingestion_job` row already exists — `jobId` here is that row's
 * id, generated up front by the caller rather than returned from this
 * event, so the caller has it immediately without waiting on the job to
 * actually run (FR-7).
 */
type IngestionJobRequested = {
  jobId: string;
  sourceUrl: string;
  sourceType: SourceType;
  requesterId: string;
  workspaceId: string;
};

export const ingestionJobRequested = eventType("ingestion/job.requested", {
  schema: staticSchema<IngestionJobRequested>(),
});
