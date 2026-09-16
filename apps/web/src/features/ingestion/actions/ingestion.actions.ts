"use server";

import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db, ingestionJob, workspaceMember } from "@collabnow/db";

import { auth } from "@/features/auth/lib";
import { inngest } from "@/lib/inngest/client";
import { parseStringify } from "@/lib/utils";
import { checkRateLimit, formatRetryAfter, RATE_LIMITS } from "@/lib/rate-limit";
import {
  type ActionResult,
  ActionError,
  actionError,
  safeAction,
} from "@/lib/action-result";

import { ingestionJobRequested } from "../inngest/events";
import { detectSourceType } from "../lib/source-detector";
import type {
  IngestionJobStatus,
  IngestionJobStatusView,
  SourceType,
} from "../types";

/**
 * Server actions for the ingestion pipeline (P1-5). `enqueueIngestionJob`
 * is the "submit a URL" entry point FR-7 describes: the caller gets a job
 * id back immediately, without waiting on the fetch/validate/persist work
 * that happens asynchronously in `processIngestionJob`
 * (`features/ingestion/inngest/process-ingestion-job.ts`).
 * `getIngestionJobStatus` is the poll side of that same requirement.
 */

async function requireWorkspaceMembership(
  workspaceId: string,
  userId: string
): Promise<void> {
  const [membership] = await db
    .select({ id: workspaceMember.id })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, userId)
      )
    )
    .limit(1);

  if (!membership) {
    throw new ActionError("You don't have access to this workspace.");
  }
}

export const enqueueIngestionJob = async ({
  workspaceId,
  sourceUrl,
}: {
  workspaceId: string;
  sourceUrl: string;
}): Promise<ActionResult<{ jobId: string }>> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return actionError("You must be signed in to submit a URL.");
  }

  const rateLimit = await checkRateLimit(
    RATE_LIMITS.ingestionSubmit,
    session.user.id
  );
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
    await requireWorkspaceMembership(workspaceId, session.user.id);

    const jobId = nanoid();

    await db.insert(ingestionJob).values({
      id: jobId,
      sourceUrl,
      sourceType,
      requesterId: session.user.id,
      workspaceId,
      status: "queued",
    });

    try {
      await inngest.send(
        ingestionJobRequested.create({
          jobId,
          sourceUrl,
          sourceType,
          requesterId: session.user.id,
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

      console.error(error);
      throw new ActionError("Failed to queue this job. Please try again.");
    }

    return { jobId };
  }, "Failed to submit this URL. Please try again.");
};

export const getIngestionJobStatus = async ({
  jobId,
}: {
  jobId: string;
}): Promise<ActionResult<IngestionJobStatusView>> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return actionError("You must be signed in to view job status.");
  }

  return safeAction(async () => {
    const [job] = await db
      .select()
      .from(ingestionJob)
      .where(eq(ingestionJob.id, jobId))
      .limit(1);

    if (!job) {
      throw new ActionError("That job could not be found.");
    }

    // Workspace-shared, not requester-only — once P1-7 lands, the resulting
    // document will be visible to the whole workspace anyway.
    await requireWorkspaceMembership(job.workspaceId, session.user.id);

    return parseStringify({
      id: job.id,
      status: job.status as IngestionJobStatus,
      sourceType: job.sourceType as SourceType,
      sourceUrl: job.sourceUrl,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  }, "Failed to load job status. Please try again.");
};
