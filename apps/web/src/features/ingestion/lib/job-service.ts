import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, ingestionJob, sourceContent, document } from "@collabnow/db";

import { inngest } from "@/lib/inngest/client";
import { parseStringify } from "@/lib/utils";
import { checkRateLimit, formatRetryAfter, RATE_LIMITS } from "@/lib/rate-limit";
import { requireWorkspaceMembership } from "@/lib/workspace";
import {
  type ActionResult,
  ActionError,
  actionError,
  safeAction,
} from "@/lib/action-result";

import { ingestionJobRequested } from "../inngest/events";
import { detectSourceType } from "./source-detector";
import {
  reserveNotesGenerationSlot,
  releaseNotesGenerationSlot,
} from "@/features/billing/lib/usage-enforcement";
import type { IngestionJobStatus, IngestionJobStatusView, SourceType } from "../types";

/**
 * The `userId`-taking core of `enqueueIngestionJob`/`getIngestionJobStatus`
 * (`features/ingestion/actions/ingestion.actions.ts`), pulled out so both
 * that session-authenticated server action and the personal-access-token
 * authenticated extension routes (`app/api/extension/generate`,
 * `app/api/extension/jobs/[id]`, P2-7) share one implementation instead of
 * two copies of the same job-queueing/status logic diverging over time.
 * Callers are responsible for resolving `userId` themselves — a Better
 * Auth session for the web app, `auth.api.verifyApiKey` for the extension —
 * before calling into here.
 */

export async function enqueueIngestionJobForUser({
  userId,
  workspaceId,
  sourceUrl,
}: {
  userId: string;
  workspaceId: string;
  sourceUrl: string;
}): Promise<ActionResult<{ jobId: string }>> {
  const rateLimit = await checkRateLimit(RATE_LIMITS.ingestionSubmit, userId);
  if (!rateLimit.success) {
    return actionError(
      `You're submitting content too quickly. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds!)}.`,
      rateLimit.retryAfterSeconds
    );
  }

  const sourceType = detectSourceType(sourceUrl);
  if (!sourceType) {
    return actionError(
      "That doesn't look like a valid YouTube or article URL."
    );
  }

  return safeAction(async () => {
    await requireWorkspaceMembership(workspaceId, userId);

    // P3-4 / FR-20: enforce the workspace's plan limit *before* the job
    // row exists, not after — reserveNotesGenerationSlot atomically
    // increments the workspace's usage_counter for this billing period
    // and reports whether that increment was allowed to happen at all.
    const usage = await reserveNotesGenerationSlot(workspaceId);
    if (!usage.allowed) {
      throw new ActionError(
        `This workspace has used all ${usage.limit} notes included in its plan this month. Upgrade to generate more.`
      );
    }

    const jobId = nanoid();

    await db.insert(ingestionJob).values({
      id: jobId,
      sourceUrl,
      sourceType,
      requesterId: userId,
      workspaceId,
      status: "queued",
    });

    try {
      await inngest.send(
        ingestionJobRequested.create({
          jobId,
          sourceUrl,
          sourceType,
          requesterId: userId,
          workspaceId,
        })
      );
    } catch (error) {
      // The job row already exists at this point — if it can't actually be
      // queued, mark it failed right away instead of leaving it stuck at
      // "queued" forever with nothing to ever pick it up.
      await db
        .update(ingestionJob)
        .set({
          status: "failed",
          errorMessage: "Failed to queue this job. Please try again.",
          updatedAt: new Date(),
        })
        .where(eq(ingestionJob.id, jobId));

      // The job never actually got queued — don't charge the workspace's
      // monthly cap for a generation attempt that will never run.
      await releaseNotesGenerationSlot(workspaceId);

      console.error(error);
      throw new ActionError("Failed to queue this job. Please try again.");
    }

    return { jobId };
  }, "Failed to submit this URL. Please try again.");
}

export async function getIngestionJobStatusForUser({
  userId,
  jobId,
}: {
  userId: string;
  jobId: string;
}): Promise<ActionResult<IngestionJobStatusView>> {
  return safeAction(async () => {
    // Left-joined through source_content to document so `roomId` comes
    // back in the same query once P1-7's save-document step has linked
    // them — both joins resolve to all-null columns for a job that hasn't
    // reached that point yet, not a missing row.
    const [row] = await db
      .select({
        id: ingestionJob.id,
        workspaceId: ingestionJob.workspaceId,
        status: ingestionJob.status,
        sourceType: ingestionJob.sourceType,
        sourceUrl: ingestionJob.sourceUrl,
        errorMessage: ingestionJob.errorMessage,
        createdAt: ingestionJob.createdAt,
        updatedAt: ingestionJob.updatedAt,
        roomId: document.roomId,
      })
      .from(ingestionJob)
      .leftJoin(
        sourceContent,
        eq(sourceContent.ingestionJobId, ingestionJob.id)
      )
      .leftJoin(document, eq(sourceContent.documentId, document.id))
      .where(eq(ingestionJob.id, jobId))
      .limit(1);

    if (!row) {
      throw new ActionError("That job could not be found.");
    }

    // Workspace-shared, not requester-only — the resulting document is
    // visible to the whole workspace anyway once it exists (P1-7).
    await requireWorkspaceMembership(row.workspaceId, userId);

    return parseStringify({
      id: row.id,
      status: row.status as IngestionJobStatus,
      sourceType: row.sourceType as SourceType,
      sourceUrl: row.sourceUrl,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      roomId: row.roomId ?? null,
    });
  }, "Failed to load job status. Please try again.");
}
