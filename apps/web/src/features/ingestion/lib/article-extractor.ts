import { JSDOM } from "jsdom";
import { isProbablyReaderable, Readability } from "@mozilla/readability";

/**
 * Article HTML fetching + readability-style extraction (P1-3 / PRD FR-4).
 * Fetches the page's raw HTML over plain HTTP and runs Mozilla's
 * `Readability` (the Firefox Reader View engine) against it via `jsdom` —
 * no headless browser, no script execution. That's a deliberate choice, not
 * a limitation to work around later: FR-4 requires JS-rendered pages to
 * *fail cleanly* rather than return garbled output, and a page whose body is
 * populated by client-side JS will simply have too little content in the
 * static HTML for `Readability`/`isProbablyReaderable` to consider it an
 * article — which is exactly the signal this module turns into a clear
 * `extraction-failed` error instead of guessing at a rendered DOM.
 *
 * Mirrors `youtube-transcript.ts`'s shape on purpose so P1-4 (source
 * validation) and P1-5 (job pipeline wiring) can treat both source types
 * uniformly: a domain error class with a closed set of failure reasons,
 * retry-with-backoff (PRD A10 Reliability) only for failure modes actually
 * worth retrying, and a plain-text result callers don't need to know the
 * extraction internals to consume.
 */

/**
 * Domain-level reasons an article fetch/extraction can fail.
 * `invalid-url`, `not-found`, `forbidden`, `not-html`, `too-large`, and
 * `extraction-failed` are permanent/business failures — fail fast, no
 * retry (FR-4: "extraction failure -> clear error, no partial/garbled
 * output"). `blocked` and `unknown` are treated as transient and retried
 * with exponential backoff.
 */
export type ArticleFetchFailureReason =
  | "invalid-url"
  | "not-found"
  | "forbidden"
  | "not-html"
  | "too-large"
  | "extraction-failed"
  | "blocked"
  | "unknown";

const RETRIABLE_REASONS: ReadonlySet<ArticleFetchFailureReason> = new Set([
  "blocked",
  "unknown",
]);

export class ArticleFetchError extends Error {
  readonly reason: ArticleFetchFailureReason;

  constructor(message: string, reason: ArticleFetchFailureReason) {
    super(message);
    this.name = "ArticleFetchError";
    this.reason = reason;
  }
}

export interface ArticleExtractionResult {
  /** Article title, if `Readability` could determine one. */
  title: string | null;
  /** Plain body text — HTML tags stripped, whitespace-normalized. */
  text: string;
  /** Short excerpt/description `Readability` derived from the content. */
  excerpt: string | null;
  /** Author metadata, if present. */
  byline: string | null;
  siteName: string | null;
  /**
   * Content language from the page's `lang` attribute/metadata, if present.
   * This is whatever the *page* claims, not a language-detection pass over
   * the extracted text — P1-4's source-language validation should treat it
   * as a hint, not ground truth.
   */
  language: string | null;
}

export interface FetchArticleOptions {
  /** Max attempts for retriable ("blocked"/"unknown") failures. Default 3. */
  maxAttempts?: number;
  /** Base delay (ms) for exponential backoff between retries. Default 500. */
  baseDelayMs?: number;
  /** Injectable for tests; defaults to a real `setTimeout`-based sleep. */
  delay?: (ms: number) => Promise<void>;
  /** Injectable for tests; defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Per-attempt network timeout in ms. Default 15000. */
  timeoutMs?: number;
  /**
   * Minimum extracted body length (characters, after whitespace
   * normalization) below which the result is treated as extraction
   * failure rather than a real-but-short article — this is the heuristic
   * that catches paywalled teasers and JS-rendered shells. Default 250.
   */
  minContentLength?: number;
  /** Hard cap on response body size in bytes, to bound parse cost. Default 8MB. */
  maxHtmlBytes?: number;
}

const DEFAULT_MIN_CONTENT_LENGTH = 250;
const DEFAULT_MAX_HTML_BYTES = 8 * 1024 * 1024;

function defaultDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ArticleFetchError(
      "That doesn't look like a valid URL.",
      "invalid-url"
    );
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ArticleFetchError(
      "Only http/https URLs are supported.",
      "invalid-url"
    );
  }
  return parsed;
}

function classifyStatus(status: number): ArticleFetchFailureReason {
  if (status === 404 || status === 410) return "not-found";
  if (status === 401 || status === 403 || status === 451) return "forbidden";
  if (status === 429 || status >= 500) return "blocked";
  return "unknown";
}

function toActionableMessage(
  reason: ArticleFetchFailureReason,
  original: unknown
): string {
  switch (reason) {
    case "invalid-url":
      return "That doesn't look like a valid article URL.";
    case "not-found":
      return "That page couldn't be found (it may have been moved or deleted).";
    case "forbidden":
      return "Access to this page is restricted — it may be behind a login or paywall.";
    case "not-html":
      return "That URL doesn't point to a readable HTML page (e.g. a PDF or API response).";
    case "too-large":
      return "That page is too large to process.";
    case "extraction-failed":
      return "Couldn't extract readable article content from this page — it may be paywalled, JavaScript-rendered, or not in a standard article layout.";
    case "blocked":
      return "The site is temporarily rate-limiting or blocking requests. Please try again shortly.";
    case "unknown":
      return original instanceof Error
        ? `Failed to fetch the article: ${original.message}`
        : "Failed to fetch the article for an unknown reason.";
  }
}

async function fetchHtml(
  url: URL,
  fetchImpl: typeof fetch,
  timeoutMs: number,
  maxHtmlBytes: number
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // A generic browser-like Accept header; some sites 406 on bare
        // fetch/bot-style requests otherwise.
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const reason = classifyStatus(response.status);
    throw new ArticleFetchError(
      `${toActionableMessage(reason, undefined)} (HTTP ${response.status})`,
      reason
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("html") && !contentType.includes("xml")) {
    throw new ArticleFetchError(toActionableMessage("not-html", undefined), "not-html");
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxHtmlBytes) {
    throw new ArticleFetchError(toActionableMessage("too-large", undefined), "too-large");
  }

  const html = await response.text();
  if (Buffer.byteLength(html, "utf8") > maxHtmlBytes) {
    throw new ArticleFetchError(toActionableMessage("too-large", undefined), "too-large");
  }

  return html;
}

function extract(html: string, url: URL): ArticleExtractionResult {
  const dom = new JSDOM(html, { url: url.toString() });
  const document = dom.window.document;

  if (!isProbablyReaderable(document)) {
    throw new ArticleFetchError(
      toActionableMessage("extraction-failed", undefined),
      "extraction-failed"
    );
  }

  // `Readability` mutates the document it's given, so it must run on a
  // dedicated parse — this is also why `isProbablyReaderable` is checked
  // first, on the pristine document.
  const article = new Readability(document).parse();
  const text = (article?.textContent ?? "").replace(/\s+/g, " ").trim();

  if (!article || text.length < 1) {
    throw new ArticleFetchError(
      toActionableMessage("extraction-failed", undefined),
      "extraction-failed"
    );
  }

  return {
    title: article.title ?? null,
    text,
    excerpt: article.excerpt ?? null,
    byline: article.byline ?? null,
    siteName: article.siteName ?? null,
    language: article.lang ?? null,
  };
}

/**
 * Fetch a page's HTML and extract its main body via readability-style
 * extraction (FR-4). Discards navigation/ads/unrelated chrome. Paywalled or
 * JS-rendered pages fail with `ArticleFetchError` (reason `"forbidden"` or
 * `"extraction-failed"`) rather than returning partial/garbled content.
 *
 * Does not enforce the 20,000-word cap or source-language allowlist —
 * that's P1-4's job, applied to whatever this returns.
 */
export async function fetchArticle(
  url: string,
  options: FetchArticleOptions = {}
): Promise<ArticleExtractionResult> {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    delay = defaultDelay,
    fetch: fetchImpl = fetch,
    timeoutMs = 15_000,
    minContentLength = DEFAULT_MIN_CONTENT_LENGTH,
    maxHtmlBytes = DEFAULT_MAX_HTML_BYTES,
  } = options;

  const parsedUrl = parseUrl(url);

  for (let attempt = 1; ; attempt++) {
    try {
      const html = await fetchHtml(parsedUrl, fetchImpl, timeoutMs, maxHtmlBytes);
      const result = extract(html, parsedUrl);

      if (result.text.length < minContentLength) {
        throw new ArticleFetchError(
          toActionableMessage("extraction-failed", undefined),
          "extraction-failed"
        );
      }

      return result;
    } catch (error) {
      if (error instanceof ArticleFetchError) {
        const canRetry =
          RETRIABLE_REASONS.has(error.reason) && attempt < maxAttempts;
        if (!canRetry) throw error;
        await delay(baseDelayMs * 2 ** (attempt - 1));
        continue;
      }

      // Network-level failures (DNS, TLS, abort/timeout, connection reset)
      // surface as plain Errors/DOMExceptions from `fetch`, not our own
      // error type — treat those as transient and retry.
      const canRetry = attempt < maxAttempts;
      if (!canRetry) {
        throw new ArticleFetchError(toActionableMessage("unknown", error), "unknown");
      }
      await delay(baseDelayMs * 2 ** (attempt - 1));
    }
  }
}
