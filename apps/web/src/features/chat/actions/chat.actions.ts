"use server";

import { headers } from "next/headers";
import { eq, and, sql } from "drizzle-orm";
import { db, document, documentChunk, workspaceMember } from "@collabnow/db";

import { auth } from "@/features/auth/lib";
import { embedQuery } from "@/lib/gemini";
import { checkRateLimit, formatRetryAfter, RATE_LIMITS } from "@/lib/rate-limit";
import {
  type ActionResult,
  ActionError,
  actionError,
  safeAction,
} from "@/lib/action-result";

import { answerQuestionFromChunks, CHAT_TOP_K } from "../lib/document-chat";

/**
 * Server action for P2-4's "Ask about this" chat/RAG endpoint (PRD §6.10,
 * FR-12 through FR-14). `askAboutDocument` is the only entry point: it
 * takes a `roomId` and a question, never a `documentId` — the document a
 * question is scoped to is always re-derived server-side from `roomId`
 * (same trust-boundary rule `ingestion.actions.ts` follows), so there is no
 * client-controllable input that could point retrieval at another
 * document. This is what guarantees PRD §10's isolation requirement: chat
 * retrieval must never surface chunks from another user's/workspace's
 * documents.
 */

const MAX_QUESTION_LENGTH = 2000;

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

/**
 * Cheap existence check backing P2-5's "only show the chat panel on
 * documents with indexed source content" requirement — the UI (`documents/
 * [id]/page.tsx`) calls this instead of `askAboutDocument` (which does a
 * full embedding + generation call, far too expensive just to decide
 * whether to render a button) or `getGeneratedNotesForDocument` (which
 * fetches the whole notes body). Only touches `id` columns via the same
 * `document_chunk_document_id_idx` index the real retrieval query uses.
 */
export const getChatAvailability = async ({
  roomId,
}: {
  roomId: string;
}): Promise<ActionResult<{ available: boolean }>> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return actionError("You must be signed in to view this document.");
  }

  return safeAction(async () => {
    const [row] = await db
      .select({ id: document.id, workspaceId: document.workspaceId })
      .from(document)
      .where(eq(document.roomId, roomId))
      .limit(1);

    if (!row) {
      return { available: false };
    }

    await requireWorkspaceMembership(row.workspaceId, session.user.id);

    const [chunk] = await db
      .select({ id: documentChunk.id })
      .from(documentChunk)
      .where(eq(documentChunk.documentId, row.id))
      .limit(1);

    return { available: Boolean(chunk) };
  }, "Failed to check chat availability for this document.");
};

export const askAboutDocument = async ({
  roomId,
  question,
}: {
  roomId: string;
  question: string;
}): Promise<ActionResult<{ answer: string }>> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return actionError("You must be signed in to use chat.");
  }

  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    return actionError("Ask a question first.");
  }
  if (trimmedQuestion.length > MAX_QUESTION_LENGTH) {
    return actionError(
      `Questions can't be longer than ${MAX_QUESTION_LENGTH} characters.`
    );
  }

  const rateLimit = await checkRateLimit(
    RATE_LIMITS.chatQuery,
    session.user.id
  );
  if (!rateLimit.success) {
    return actionError(
      `You're asking questions too quickly. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds!)}.`,
      rateLimit.retryAfterSeconds
    );
  }

  return safeAction(async () => {
    const [row] = await db
      .select({ id: document.id, workspaceId: document.workspaceId })
      .from(document)
      .where(eq(document.roomId, roomId))
      .limit(1);

    if (!row) {
      throw new ActionError("This document could not be found.");
    }

    // Re-derived from the verified `document` row, never from client
    // input — this is the isolation boundary PRD §10 requires.
    await requireWorkspaceMembership(row.workspaceId, session.user.id);
    const documentId = row.id;

    const queryEmbedding = await embedQuery(trimmedQuestion);
    // pgvector's `vector` type has no first-class Drizzle parameter
    // binding — its own `mapToDriverValue` only runs for values assigned
    // to an actual `vector` column, not for an ad hoc `sql` fragment like
    // this one. Passing the embedding as a `[n,n,...]`-formatted text
    // parameter and casting it is pgvector's documented literal syntax;
    // every element here is a number this module itself computed (never
    // user-controlled text), so there's no injection surface even though
    // the cast happens inside a template fragment.
    const queryVectorLiteral = `[${queryEmbedding.join(",")}]`;
    const distance = sql<number>`${documentChunk.embedding} <=> ${queryVectorLiteral}::vector`;

    const chunkRows = await db
      .select({ content: documentChunk.content })
      .from(documentChunk)
      // Scoped to the one server-verified documentId — the query never
      // has a way to reach another document's chunks.
      .where(eq(documentChunk.documentId, documentId))
      .orderBy(distance)
      .limit(CHAT_TOP_K);

    if (chunkRows.length === 0) {
      throw new ActionError(
        "This document doesn't have any indexed source content to chat about yet."
      );
    }

    const answer = await answerQuestionFromChunks({
      chunks: chunkRows.map((chunk) => chunk.content),
      question: trimmedQuestion,
    });

    return { answer };
  }, "Failed to answer your question. Please try again.");
};
