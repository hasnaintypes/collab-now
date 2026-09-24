/**
 * Splits source text into overlapping, roughly fixed-size chunks for P2-3's
 * embedding pipeline. Neither the PRD nor `docs/DECISIONS.md` specifies a
 * chunking strategy/granularity — this is this module's own design.
 *
 * Sentence-based rather than paragraph-based: YouTube transcripts (the
 * majority of ingested sources) are one continuous block of text with no
 * paragraph breaks at all, so splitting on blank lines would produce a
 * single giant "paragraph" for most videos. Splitting on sentence-ending
 * punctuation instead works for both transcripts and articles, and keeps
 * each chunk a coherent unit of meaning rather than an arbitrary character
 * slice through the middle of a sentence.
 *
 * Chunks overlap by `overlap` characters so a fact stated right at a chunk
 * boundary isn't stranded out of context for whichever chunk it lands in —
 * P2-4's retrieval only ever sees whole chunks, not the surrounding text.
 */

const DEFAULT_CHUNK_SIZE = 2000;
const DEFAULT_CHUNK_OVERLAP = 200;

function splitIntoSentences(text: string): string[] {
  // Keeps the sentence-ending punctuation attached to the sentence it
  // closes. Falls back to the whole string as one "sentence" if no
  // sentence-ending punctuation is found anywhere (e.g. a transcript with
  // no punctuation at all) — chunkText's character-based hard wrap below
  // still bounds the final chunk size in that case.
  const matches = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g);
  return matches ? matches.map((s) => s.trim()).filter(Boolean) : [text];
}

/** Hard-wraps a single string into pieces of at most `size` characters. */
function hardWrap(text: string, size: number): string[] {
  const pieces: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    pieces.push(text.slice(i, i + size));
  }
  return pieces;
}

export function chunkText(
  text: string,
  {
    chunkSize = DEFAULT_CHUNK_SIZE,
    overlap = DEFAULT_CHUNK_OVERLAP,
  }: { chunkSize?: number; overlap?: number } = {}
): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  // A single chunk is enough — skip the sentence-splitting/overlap
  // machinery entirely rather than produce one chunk plus a redundant
  // overlap-only remainder.
  if (normalized.length <= chunkSize) return [normalized];

  const sentences = splitIntoSentences(normalized);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    // A single sentence longer than chunkSize on its own (rare, but
    // possible with unpunctuated transcript fragments) is hard-wrapped so
    // no chunk ever exceeds the target size no matter how the source text
    // is punctuated.
    const pieces =
      sentence.length > chunkSize ? hardWrap(sentence, chunkSize) : [sentence];

    for (const piece of pieces) {
      const candidate = current ? `${current} ${piece}` : piece;
      if (candidate.length > chunkSize && current) {
        chunks.push(current);
        // Carry the tail of the just-finished chunk forward as the start
        // of the next one.
        const overlapStart = Math.max(0, current.length - overlap);
        current = `${current.slice(overlapStart)} ${piece}`.trim();
      } else {
        current = candidate;
      }
    }
  }
  if (current) chunks.push(current);

  return chunks;
}
