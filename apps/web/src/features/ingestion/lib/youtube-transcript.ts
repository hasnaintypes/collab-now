import {
  fetchTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
  type TranscriptConfig,
  type TranscriptResponse,
} from "youtube-transcript";

/**
 * YouTube caption fetching (P1-2 / PRD FR-3). Fetches an *existing* caption
 * track only — never downloads audio or performs ASR. `youtube-transcript`
 * does the actual scraping (InnerTube API first, HTML-scraping fallback);
 * this module exists as a boundary around it so:
 *
 *  - callers (P1-4 source validation, P1-5 job pipeline) depend on our own
 *    `TranscriptFetchError`/`TranscriptFetchFailureReason`, not a
 *    third-party package's exception hierarchy directly.
 *  - retry-with-backoff (PRD §10 Reliability) lives in exactly one place,
 *    and only applies to failure modes that are actually worth retrying —
 *    "no captions on this video" will never succeed no matter how many
 *    times it's retried, so it fails on the first attempt instead of
 *    wasting the caller's time reproducing the same permanent failure.
 */

/**
 * Domain-level reasons a transcript fetch can fail. `no-captions`,
 * `video-unavailable`, and `invalid-url` are permanent/business failures —
 * fail fast, no retry (FR-3: "immediate rejection with a clear message").
 * `blocked` and `unknown` are treated as transient and retried with
 * exponential backoff.
 */
export type TranscriptFetchFailureReason =
  | "no-captions"
  | "video-unavailable"
  | "invalid-url"
  | "blocked"
  | "unknown";

const RETRIABLE_REASONS: ReadonlySet<TranscriptFetchFailureReason> = new Set([
  "blocked",
  "unknown",
]);

export class TranscriptFetchError extends Error {
  readonly reason: TranscriptFetchFailureReason;

  constructor(message: string, reason: TranscriptFetchFailureReason) {
    super(message);
    this.name = "TranscriptFetchError";
    this.reason = reason;
  }
}

export interface YoutubeTranscriptResult {
  /** Plain transcript text — caption segments joined in order, whitespace-normalized. */
  text: string;
  /** Caption track language code YouTube reported (e.g. "en", "hi"). */
  language: string;
  /**
   * Total video duration in seconds, estimated from the caption track's own
   * segment timings (see `estimateDurationSeconds` — used by P1-4 source
   * validation to enforce the 60-minute cap). This is a byproduct of
   * captions we already fetched, not a separate video-metadata lookup, so
   * it's only known *after* the transcript fetch succeeds, not before it.
   */
  durationSeconds: number;
}

/**
 * `youtube-transcript`'s two caption-XML parsers report segment
 * `offset`/`duration` in different units depending on which format YouTube
 * happened to serve — the modern `srv3` format uses milliseconds, the older
 * classic-fallback format uses seconds — with nothing in the returned data
 * indicating which one was used. A single caption line is essentially never
 * displayed on screen for anywhere near this many real-world seconds, so an
 * average segment duration comfortably above it can only mean the values
 * are actually milliseconds.
 */
const MS_HEURISTIC_THRESHOLD_SECONDS = 30;

/**
 * Normalizes caption segment timings to a single "duration of the
 * transcript, in seconds" figure regardless of which unit the underlying
 * library happened to return (see `MS_HEURISTIC_THRESHOLD_SECONDS`).
 */
function estimateDurationSeconds(segments: TranscriptResponse[]): number {
  const last = segments[segments.length - 1]!;
  const rawEnd = last.offset + last.duration;
  const averageSegmentDuration =
    segments.reduce((sum, segment) => sum + segment.duration, 0) /
    segments.length;

  const isMilliseconds = averageSegmentDuration > MS_HEURISTIC_THRESHOLD_SECONDS;
  return isMilliseconds ? rawEnd / 1000 : rawEnd;
}

export interface FetchYoutubeTranscriptOptions {
  /** Max attempts for retriable ("blocked"/"unknown") failures. Default 3. */
  maxAttempts?: number;
  /** Base delay (ms) for exponential backoff between retries. Default 500. */
  baseDelayMs?: number;
  /** Injectable for tests; defaults to a real `setTimeout`-based sleep. */
  delay?: (ms: number) => Promise<void>;
  /** Forwarded to `youtube-transcript` — useful for tests/custom networking. */
  fetch?: TranscriptConfig["fetch"];
}

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyError(error: unknown): TranscriptFetchFailureReason {
  if (error instanceof YoutubeTranscriptTooManyRequestError) return "blocked";
  if (
    error instanceof YoutubeTranscriptDisabledError ||
    error instanceof YoutubeTranscriptNotAvailableError ||
    error instanceof YoutubeTranscriptNotAvailableLanguageError
  ) {
    return "no-captions";
  }
  if (error instanceof YoutubeTranscriptVideoUnavailableError) {
    return "video-unavailable";
  }
  if (error instanceof YoutubeTranscriptError) {
    // Base class only reaches here for e.g. "Impossible to retrieve
    // Youtube video ID" — a malformed input, not an upstream problem.
    return "invalid-url";
  }
  return "unknown";
}

function toActionableMessage(
  reason: TranscriptFetchFailureReason,
  original: unknown
): string {
  switch (reason) {
    case "no-captions":
      return "This video doesn't have captions available, so notes can't be generated from it.";
    case "video-unavailable":
      return "This video is unavailable (deleted, private, or region-restricted).";
    case "invalid-url":
      return "That doesn't look like a valid YouTube video URL.";
    case "blocked":
      return "YouTube is temporarily rate-limiting caption requests. Please try again shortly.";
    case "unknown":
      return original instanceof Error
        ? `Failed to fetch the YouTube transcript: ${original.message}`
        : "Failed to fetch the YouTube transcript for an unknown reason.";
  }
}

/**
 * Fetch the existing caption track for a YouTube video/URL and return it as
 * plain text + the detected caption language (FR-3). Does not validate that
 * the language is one CollabNow supports (en/hi/ur, FR-6) — that's P1-4's
 * job, applied to whatever this returns.
 */
export async function fetchYoutubeTranscript(
  url: string,
  options: FetchYoutubeTranscriptOptions = {}
): Promise<YoutubeTranscriptResult> {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    delay = defaultDelay,
    fetch,
  } = options;

  for (let attempt = 1; ; attempt++) {
    try {
      const segments = await fetchTranscript(url, { fetch });

      if (segments.length === 0) {
        // Defensive: the library throws `YoutubeTranscriptDisabledError`/
        // `YoutubeTranscriptNotAvailableError` for the normal "no captions"
        // case rather than resolving empty, but guard against it anyway.
        throw new TranscriptFetchError(
          toActionableMessage("no-captions", undefined),
          "no-captions"
        );
      }

      const text = segments
        .map((segment) => segment.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const language = segments[0].lang ?? "unknown";
      const durationSeconds = estimateDurationSeconds(segments);

      return { text, language, durationSeconds };
    } catch (error) {
      if (error instanceof TranscriptFetchError) throw error;

      const reason = classifyError(error);
      const canRetry = RETRIABLE_REASONS.has(reason) && attempt < maxAttempts;

      if (!canRetry) {
        throw new TranscriptFetchError(
          toActionableMessage(reason, error),
          reason
        );
      }

      await delay(baseDelayMs * 2 ** (attempt - 1));
    }
  }
}
