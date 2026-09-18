import { franc } from "franc";

/**
 * Source validation (P1-4 / PRD FR-5, FR-6) — enforces the video-length
 * cap, the article word-count cap, and the English/Hindi/Urdu-only source
 * language restriction, applied to whatever P1-2 (`youtube-transcript.ts`)
 * or P1-3 (`article-extractor.ts`) already fetched/extracted. Every check
 * fails with a specific, actionable message per PRD §6.8 ("never a silent
 * failure or partial result") rather than a generic rejection.
 *
 * Language is determined by running `franc` (trigram-based language
 * detection) against the actual extracted text, not by trusting either
 * fetcher's own language field — YouTube's reported caption-track language
 * can be wrong, and `article-extractor.ts`'s `language` is explicitly
 * documented as "a hint, not ground truth" (it's just the page's `lang`
 * attribute, which pages routinely omit or mislabel).
 */

/** Video transcript cap (PRD §6.8): 60 minutes. */
export const MAX_VIDEO_DURATION_SECONDS = 60 * 60;

/** Article cap (PRD §6.8): 20,000 words. */
export const MAX_ARTICLE_WORD_COUNT = 20_000;

/** The only source languages CollabNow accepts (PRD §6.8 / FR-6), in the
 * two-letter form `source_content.sourceLanguage` (P1-1) stores them in. */
export type SupportedLanguage = "en" | "hi" | "ur";

/**
 * Maps franc's ISO 639-3 output to the two-letter codes this codebase
 * otherwise uses. `franc` returns `"und"` when it can't confidently
 * determine a language (e.g. text too short) — absent from this map, and
 * so treated as unsupported rather than assumed-allowed, since we can't
 * confirm it's one of these three.
 */
const LANGUAGE_CODE_MAP: Record<string, SupportedLanguage> = {
  eng: "en",
  hin: "hi",
  urd: "ur",
};

/**
 * Domain-level reasons a source can fail validation. All three are
 * permanent/business failures — there's nothing to retry, the source
 * itself doesn't qualify.
 */
export type SourceValidationFailureReason =
  | "video-too-long"
  | "article-too-long"
  | "unsupported-language";

export class SourceValidationError extends Error {
  readonly reason: SourceValidationFailureReason;

  constructor(message: string, reason: SourceValidationFailureReason) {
    super(message);
    this.name = "SourceValidationError";
    this.reason = reason;
  }
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function formatMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

/**
 * Detects the language of `text` from its content (not from any metadata
 * the caller might have on hand) and returns the two-letter code if it's
 * one of the languages CollabNow accepts, or `null` otherwise.
 */
function detectSupportedLanguage(text: string): SupportedLanguage | null {
  const detected = franc(text, { minLength: 10 });
  return LANGUAGE_CODE_MAP[detected] ?? null;
}

/**
 * Validates a fetched YouTube transcript against the 60-minute cap and the
 * English/Hindi/Urdu-only language restriction (FR-5, FR-6). Throws
 * `SourceValidationError` on the first failing check rather than any
 * further processing (e.g. Gemini generation) beginning. On success,
 * returns the detected source language — P1-5's job pipeline persists this
 * directly to `source_content.sourceLanguage` rather than re-detecting it.
 */
export function validateYoutubeSource(source: {
  text: string;
  durationSeconds: number;
}): SupportedLanguage {
  if (source.durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
    throw new SourceValidationError(
      `This video is about ${formatMinutes(source.durationSeconds)} long, which is over the 60-minute limit for generating notes.`,
      "video-too-long"
    );
  }

  const language = detectSupportedLanguage(source.text);
  if (!language) {
    throw new SourceValidationError(
      "This video's language isn't supported — notes can only be generated from English, Hindi, or Urdu content.",
      "unsupported-language"
    );
  }

  return language;
}

/**
 * Validates extracted article text against the 20,000-word cap and the
 * English/Hindi/Urdu-only language restriction (FR-5, FR-6). Throws
 * `SourceValidationError` on the first failing check rather than any
 * further processing (e.g. Gemini generation) beginning. On success,
 * returns the detected source language — P1-5's job pipeline persists this
 * directly to `source_content.sourceLanguage` rather than re-detecting it.
 */
export function validateArticleSource(source: {
  text: string;
}): SupportedLanguage {
  const wordCount = countWords(source.text);
  if (wordCount > MAX_ARTICLE_WORD_COUNT) {
    throw new SourceValidationError(
      `This article is about ${wordCount.toLocaleString()} words, which is over the 20,000-word limit for generating notes.`,
      "article-too-long"
    );
  }

  const language = detectSupportedLanguage(source.text);
  if (!language) {
    throw new SourceValidationError(
      "This article's language isn't supported — notes can only be generated from English, Hindi, or Urdu content.",
      "unsupported-language"
    );
  }

  return language;
}
