import { API_BASE_URL } from "./config";
import type { SourceType } from "@collabnow/shared";

export type JobResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; retryAfterSeconds?: number };

export type JobStatus = "queued" | "processing" | "ready" | "failed";

export type JobStatusView = {
  id: string;
  status: JobStatus;
  sourceType: SourceType;
  sourceUrl: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  roomId: string | null;
};

/**
 * Shared response handling for both calls below: the web app's
 * `/api/extension/*` routes (P2-7) return the same `ActionResult<T>` shape
 * (`@/lib/action-result`) as every web app server action on a 200, and a
 * plain `{ error }` (no `success` field) on a non-200 — request-level
 * failures (missing/invalid token, malformed body) rather than a business
 * one. Normalizing both into one `JobResult<T>` here means the popup only
 * ever has to branch on `.success`, never on HTTP status.
 */
async function parseJobResponse<T>(response: Response): Promise<JobResult<T>> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "CollabNow sent back an unreadable response." };
  }

  if (!response.ok) {
    const error =
      typeof data === "object" && data !== null && "error" in data
        ? (data as { error: unknown }).error
        : undefined;
    return {
      success: false,
      error: typeof error === "string" ? error : "Something went wrong.",
    };
  }

  return data as JobResult<T>;
}

/**
 * Enqueues an ingestion job for `sourceUrl` (P2-7 / PRD Flow A step 3) —
 * the extension's equivalent of the web app's "New from URL" dialog
 * submitting through `enqueueIngestionJob`. The workspace is resolved
 * server-side from the token's account, not passed here — the extension
 * has no workspace picker.
 */
export async function generateNotes(
  token: string,
  sourceUrl: string
): Promise<JobResult<{ jobId: string }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/extension/generate`, {
      method: "POST",
      headers: { "x-api-key": token, "Content-Type": "application/json" },
      body: JSON.stringify({ sourceUrl }),
    });
    return await parseJobResponse(response);
  } catch {
    return {
      success: false,
      error: "Couldn't reach CollabNow. Check your connection and try again.",
    };
  }
}

/** Polls a job's status (P2-7 / FR-17) — see `generateNotes` above. */
export async function getJobStatus(
  token: string,
  jobId: string
): Promise<JobResult<JobStatusView>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/extension/jobs/${jobId}`, {
      method: "GET",
      headers: { "x-api-key": token },
    });
    return await parseJobResponse(response);
  } catch {
    return {
      success: false,
      error: "Couldn't reach CollabNow. Check your connection and try again.",
    };
  }
}
