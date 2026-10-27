"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, sourceContent, document } from "@collabnow/db";

import { auth } from "@/features/auth/lib";
import { checkRateLimit, formatRetryAfter, RATE_LIMITS } from "@/lib/rate-limit";
import { requireWorkspaceMembership } from "@/lib/workspace";
import {
  type ActionResult,
  ActionError,
  actionError,
  safeAction,
} from "@/lib/action-result";

import {
  enqueueIngestionJobForUser,
  getIngestionJobStatusForUser,
} from "../lib/job-service";
import { generateNotes, NOTE_STYLE_LABELS } from "../lib/notes-generator";
import type { SupportedLanguage } from "../lib/source-validator";
import type { IngestionJobStatusView, NoteStyle } from "../types";

/**
 * Server actions for the ingestion pipeline (P1-5). `enqueueIngestionJob`
 * is the "submit a URL" entry point FR-7 describes: the caller gets a job
 * id back immediately, without waiting on the fetch/validate/persist work
 * that happens asynchronously in `processIngestionJob`
 * (`features/ingestion/inngest/process-ingestion-job.ts`).
 * `getIngestionJobStatus` is the poll side of that same requirement. Both
 * are thin session-auth wrappers around `../lib/job-service`'s `userId`-
 * taking core — the extension's equivalent routes (P2-7,
 * `app/api/extension/generate`/`jobs/[id]`) wrap that same core with
 * personal-access-token auth instead, so the queueing/status logic itself
 * only exists once.
 */

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

  return enqueueIngestionJobForUser({
    userId: session.user.id,
    workspaceId,
    sourceUrl,
  });
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

  return getIngestionJobStatusForUser({ userId: session.user.id, jobId });
};

/** Max attempts for the transient-DB-error retry below. */
const GET_NOTES_MAX_ATTEMPTS = 3;
const GET_NOTES_BASE_DELAY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Read side of P1-8's client-side content-seeding: the editor
 * (`features/editor/components/plugins/seed-notes-plugin.tsx`) calls this
 * once, on first open, only if the room turns out to be empty — most
 * documents (manually created, or already seeded) never call this at all,
 * since the emptiness check that gates it is a pure client-side check with
 * no network round trip. Returns `null` for any document that isn't
 * ingestion-derived (the inner join naturally excludes those) or whose
 * notes haven't finished generating yet, rather than an error — both are
 * expected, ordinary states, not failures.
 *
 * Retries the query itself a couple of times on failure: this call sits on
 * the one-shot seeding path (the client only attempts it once per page
 * view, with no polling/subscription behind it), so a single transient
 * connection failure here — observed in practice against Neon's HTTP
 * driver — would otherwise leave a document permanently blank until the
 * user manually reloads. Anything that reaches this catch is an
 * infra-level failure (the query itself has no business-logic failure
 * mode besides "no matching row," which is handled above, not thrown).
 */
export const getGeneratedNotesForDocument = async ({
  roomId,
}: {
  roomId: string;
}): Promise<ActionResult<{ notes: string; noteStyle: NoteStyle } | null>> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return actionError("You must be signed in to view this document.");
  }

  return safeAction(async () => {
    let row: { workspaceId: string; generatedNotes: string | null; noteStyle: string } | undefined;

    for (let attempt = 1; ; attempt++) {
      try {
        [row] = await db
          .select({
            workspaceId: document.workspaceId,
            generatedNotes: sourceContent.generatedNotes,
            noteStyle: sourceContent.noteStyle,
          })
          .from(document)
          .innerJoin(sourceContent, eq(sourceContent.documentId, document.id))
          .where(eq(document.roomId, roomId))
          .limit(1);
        break;
      } catch (error) {
        if (attempt >= GET_NOTES_MAX_ATTEMPTS) throw error;
        await delay(GET_NOTES_BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }

    if (!row || !row.generatedNotes) {
      return null;
    }

    await requireWorkspaceMembership(row.workspaceId, session.user.id);

    return { notes: row.generatedNotes, noteStyle: row.noteStyle as NoteStyle };
  }, "Failed to load this document's generated notes.");
};

/**
 * Regenerates a document's notes in a different style (P2-1 / PRD FR-9) —
 * the backend half of "Style picker + regenerate UI" (P2-2, which owns the
 * dropdown/trigger and replacing the editor's content; this action only
 * does the generation + persistence). Reuses this document's already-
 * stored `source_content.rawText`/`sourceLanguage` — nothing here ever
 * re-fetches the source URL or re-runs extraction, satisfying FR-9's
 * "switching style never re-fetches" requirement by construction: there's
 * no code path to a fetcher anywhere in this function.
 */
export const regenerateNotes = async ({
  roomId,
  style,
}: {
  roomId: string;
  style: NoteStyle;
}): Promise<ActionResult<{ notes: string }>> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return actionError("You must be signed in to regenerate notes.");
  }

  if (!(style in NOTE_STYLE_LABELS)) {
    return actionError("That's not a note style this app supports.");
  }

  const rateLimit = await checkRateLimit(
    RATE_LIMITS.notesRegenerate,
    session.user.id
  );
  if (!rateLimit.success) {
    return actionError(
      `You're regenerating notes too quickly. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds!)}.`,
      rateLimit.retryAfterSeconds
    );
  }

  return safeAction(async () => {
    const [row] = await db
      .select({
        id: sourceContent.id,
        workspaceId: document.workspaceId,
        rawText: sourceContent.rawText,
        sourceLanguage: sourceContent.sourceLanguage,
      })
      .from(document)
      .innerJoin(sourceContent, eq(sourceContent.documentId, document.id))
      .where(eq(document.roomId, roomId))
      .limit(1);

    if (!row) {
      throw new ActionError(
        "This document doesn't have any source content to regenerate notes from."
      );
    }

    await requireWorkspaceMembership(row.workspaceId, session.user.id);

    const notes = await generateNotes({
      text: row.rawText,
      language: row.sourceLanguage as SupportedLanguage,
      style,
    });

    await db
      .update(sourceContent)
      .set({ generatedNotes: notes, noteStyle: style, updatedAt: new Date() })
      .where(eq(sourceContent.id, row.id));

    return { notes };
  }, "Failed to regenerate notes. Please try again.");
};
