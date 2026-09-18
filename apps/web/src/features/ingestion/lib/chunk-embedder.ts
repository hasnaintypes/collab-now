import { embedTexts } from "@/lib/gemini";
import { chunkText } from "./chunk-text";

/**
 * P2-3: thin glue between `chunkText` (pure splitting) and the P0-14 Gemini
 * wrapper's `embedTexts` — pairs each chunk with its embedding vector,
 * ready to insert as `document_chunk` rows (`packages/db/src/schema/app.ts`).
 * Deliberately thin, same rationale as `notes-generator.ts`: the actual
 * DB read/write and idempotency-on-retry logic belongs in the Inngest step
 * that calls this (`inngest/process-ingestion-job.ts`), not here.
 */
export type EmbeddedChunk = {
  content: string;
  embedding: number[];
};

export async function embedSourceChunks(
  rawText: string
): Promise<EmbeddedChunk[]> {
  const chunks = chunkText(rawText);
  if (chunks.length === 0) return [];

  const embeddings = await embedTexts(chunks);
  return chunks.map((content, i) => ({ content, embedding: embeddings[i]! }));
}
