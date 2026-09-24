import { generateText } from "@/lib/gemini";

/**
 * P2-4's "Ask about this" chat/RAG answer generation. Deliberately thin,
 * same shape as `features/ingestion/lib/notes-generator.ts`: build one
 * prompt combining retrieved context with the question, and call the
 * P0-14 Gemini wrapper's `generateText` as-is.
 *
 * The retrieval half (embedding the question, querying `document_chunk`
 * for the nearest chunks, and enforcing per-document/workspace isolation)
 * lives in `../actions/chat.actions.ts` instead of here, matching this
 * codebase's convention of keeping DB access in actions files and lib/
 * files pure — see `notes-generator.ts`, `chunk-embedder.ts`, etc.
 */

/** How many of a document's nearest chunks to retrieve as context per question. */
export const CHAT_TOP_K = 6;

function buildPrompt(chunks: string[], question: string): string {
  const context = chunks
    .map((chunk, i) => `[Excerpt ${i + 1}]\n${chunk}`)
    .join("\n\n");

  return (
    "You are answering a question about a single source document (a video " +
    "transcript or article) inside a note-taking app. Answer using ONLY " +
    "the excerpts below — they are the only material retrieved from that " +
    "document's own source text. Never use outside/general knowledge, and " +
    "never reference any other document. If the excerpts don't contain " +
    "enough information to answer the question, say so plainly (e.g. " +
    '"The source material doesn\'t cover that.") instead of guessing or ' +
    "filling in with general knowledge. Answer in plain text (no Markdown " +
    "headings or code blocks), concisely and directly.\n\n" +
    `Source excerpts:\n"""\n${context}\n"""\n\n` +
    `Question: ${question}`
  );
}

/**
 * Generates an answer from already-retrieved chunks of one document's own
 * source text. Callers (`chat.actions.ts`) are responsible for retrieval,
 * ordering, and isolation — this function trusts `chunks` completely and
 * has no way to know (or enforce) which document they came from, so it
 * must never be called with chunks from more than one document at once.
 */
export async function answerQuestionFromChunks({
  chunks,
  question,
}: {
  chunks: string[];
  question: string;
}): Promise<string> {
  const answer = await generateText(buildPrompt(chunks, question));
  return answer.trim();
}
