import type { SourceType } from "./lib/source-detector";

export type { SourceType };

/** Mirrors `ingestionJob.status` (`packages/db/src/schema/app.ts`, P1-1). */
export type IngestionJobStatus = "queued" | "processing" | "ready" | "failed";

/**
 * Shape `getIngestionJobStatus` (P1-5) returns for a caller to poll —
 * everything a "New from URL" UI (P1-8) needs to show progress, without
 * exposing internal fields (`requesterId`, `workspaceId`) it doesn't need.
 * `roomId` is `null` until P1-7's `save-document` step links a document to
 * this job — once `status` is `"ready"` it's always present, letting the
 * UI route the user straight into `/documents/{roomId}`.
 */
export type IngestionJobStatusView = {
  id: string;
  status: IngestionJobStatus;
  sourceType: SourceType;
  sourceUrl: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  roomId: string | null;
};
