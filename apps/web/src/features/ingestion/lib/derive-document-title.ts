/**
 * Picks a title for the document P1-7 creates from a completed ingestion
 * job. Prefers the source article's own title (most accurate, human
 * authored) when there is one, then falls back to the first heading line
 * in the Gemini-generated notes (YouTube sources have no title of their
 * own — P1-2 only fetches captions, not video metadata), then finally a
 * generic placeholder matching what a manually-created document starts
 * with.
 */

const FALLBACK_TITLE = "Untitled document";

/** Keeps an absurdly long heading/title from becoming the document title verbatim. */
const MAX_TITLE_LENGTH = 200;

function truncate(title: string): string {
  const trimmed = title.trim();
  return trimmed.length > MAX_TITLE_LENGTH
    ? trimmed.slice(0, MAX_TITLE_LENGTH).trim()
    : trimmed;
}

export function deriveDocumentTitle({
  articleTitle,
  notes,
}: {
  /** `ArticleExtractionResult.title` — `null`/absent for YouTube sources. */
  articleTitle?: string | null;
  /** The Gemini-generated notes text (Markdown, Bullet/Outline style). */
  notes: string;
}): string {
  if (articleTitle && articleTitle.trim()) {
    return truncate(articleTitle);
  }

  const headingMatch = notes.match(/^#{1,6}\s+(.+)$/m);
  if (headingMatch) {
    return truncate(headingMatch[1]!);
  }

  return FALLBACK_TITLE;
}
