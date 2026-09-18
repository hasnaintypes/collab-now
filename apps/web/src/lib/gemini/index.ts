import { GoogleGenAI } from "@google/genai";

/**
 * Server-only Gemini client wrapper. `GEMINI_API_KEY` is never read until
 * first use (same lazy-init `Proxy` pattern as `lib/liveblocks/client.ts`), so importing
 * this module doesn't blow up in contexts where the env var isn't set yet
 * (e.g. build time, or tests that mock this module entirely).
 *
 * Not wired to any feature yet — this exists so Phase 1 notes-generation
 * work (P1-6) has a starting point. See docs/ROADMAP.md P0-14.
 */
let _client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Add it to apps/web/.env (see .env.example)."
      );
    }
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

/** Default text model — see docs/ROADMAP.md P1-6 for where this gets used. */
export const GEMINI_DEFAULT_MODEL = "gemini-3-flash-preview";

/**
 * Minimal single-call wrapper: send a prompt, get back plain text.
 * Intentionally thin — real ingestion/notes-generation logic (P1-6) will
 * likely need a richer wrapper (system instructions, structured output,
 * etc.) built on top of this rather than growing this function in place.
 */
export async function generateText(
  prompt: string,
  model: string = GEMINI_DEFAULT_MODEL
): Promise<string> {
  const client = getClient();
  const response = await client.models.generateContent({
    model,
    contents: prompt,
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }
  return text;
}

/**
 * Embedding model for P2-3's chunking/embedding pipeline (`document_chunk`,
 * `packages/db/src/schema/app.ts`) — `gemini-embedding-001` is Gemini's
 * current embedding model and (unlike the older `text-embedding-004`)
 * supports Matryoshka Representation Learning: a single embedding call
 * natively produces a 3072-dimension vector that's trained to also be
 * meaningful when truncated to smaller sizes (3072/1536/768), requested via
 * `outputDimensionality` below rather than needing a separate smaller model.
 * 768 was chosen over the larger options as the smallest size Google
 * documents as retaining strong retrieval quality — this app's retrieval
 * (P2-4) is per-document (dozens of chunks, not millions), where the
 * storage/speed savings of a smaller `vector()` column matter more than
 * squeezing out the last bit of ranking quality a 3072-dim vector might add.
 */
export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";

/**
 * Must match the `dimensions` on `document_chunk.embedding`
 * (`packages/db/src/schema/app.ts`) — changing one without the other means
 * every insert fails (or worse, silently stores truncated/padded vectors)
 * since pgvector's `vector(N)` column type rejects a value of the wrong
 * length outright.
 */
export const GEMINI_EMBEDDING_DIMENSIONS = 768;

/**
 * Embeds a batch of texts in one Gemini call. Callers (`chunk-embedder.ts`)
 * are expected to pass one array element per `document_chunk` row they're
 * about to insert — batching this way is both cheaper (one request instead
 * of N) and guarantees the returned embeddings line up with the input
 * texts by array index, which `chunk-embedder.ts` relies on.
 *
 * `taskType: "RETRIEVAL_DOCUMENT"` tells the model these are documents
 * being indexed for later retrieval (as opposed to `"RETRIEVAL_QUERY"`,
 * which P2-4's chat endpoint will use when embedding the user's question) —
 * Gemini's embedding models produce measurably better retrieval rankings
 * when each side of a query/document pair is embedded with the matching
 * task type rather than a generic one.
 *
 * Truncated (sub-3072-dimension) Matryoshka embeddings aren't guaranteed to
 * come back unit-length the way the full-size embedding is, so results are
 * re-normalized to unit length here — otherwise cosine-similarity search
 * (P2-4) would be comparing vectors of inconsistent magnitude.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const client = getClient();
  const response = await client.models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: texts,
    config: {
      outputDimensionality: GEMINI_EMBEDDING_DIMENSIONS,
      taskType: "RETRIEVAL_DOCUMENT",
    },
  });

  const embeddings = response.embeddings;
  if (!embeddings || embeddings.length !== texts.length) {
    throw new Error(
      `Gemini returned ${embeddings?.length ?? 0} embeddings for ${texts.length} inputs.`
    );
  }

  return embeddings.map((embedding, i) => {
    const values = embedding.values;
    if (!values || values.length === 0) {
      throw new Error(`Gemini returned an empty embedding for input ${i}.`);
    }
    return normalize(values);
  });
}

function normalize(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vector;
  return vector.map((v) => v / magnitude);
}
