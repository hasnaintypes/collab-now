/**
 * Content-type detection (P1-5 / PRD FR-2) — classifies a submitted URL as
 * a YouTube video or a generic article purely from the URL itself, before
 * any network call. This is the one piece of FR-2 that P1-2/P1-3 don't
 * already handle: each of those modules assumes the caller already knows
 * which one to invoke.
 */

export type SourceType = "youtube" | "article";

/**
 * Hostnames YouTube serves video pages/short links from. Deliberately a
 * fixed allowlist rather than a substring match (e.g. matching "youtube"
 * anywhere in the hostname) so a lookalike domain doesn't get misclassified
 * as YouTube.
 */
const YOUTUBE_HOSTNAMES = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

/**
 * Classifies `url` as `"youtube"` or `"article"` (PRD's only two supported
 * source types — anything that isn't recognized as YouTube is treated as a
 * generic article, per FR-2). Returns `null` for input that isn't even a
 * well-formed http(s) URL, so callers can reject it immediately rather than
 * enqueuing a job that's guaranteed to fail at the fetch step.
 */
export function detectSourceType(url: string): SourceType | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  return YOUTUBE_HOSTNAMES.has(parsed.hostname.toLowerCase())
    ? "youtube"
    : "article";
}
