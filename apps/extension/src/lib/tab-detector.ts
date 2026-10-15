import { detectSourceType, type SourceType } from "@collabnow/shared";

export type ActiveTabInfo = {
  url: string;
  sourceType: SourceType | null;
};

/**
 * Reads the active tab's URL (P2-6 / PRD FR-15) — `activeTab` permission
 * grants this without needing the broader `tabs` permission, since it's
 * only ever called from a context the user just invoked (opening the
 * popup). Classifies it with the exact same `detectSourceType` used by the
 * web app's ingestion pipeline (`@collabnow/shared`, moved there for this
 * reason) so the extension and web app never disagree about what counts as
 * a YouTube video vs. an article.
 *
 * Returns `null` (not a `sourceType: null` `ActiveTabInfo`) when there's no
 * usable tab URL at all — e.g. the popup opened over a `chrome://` internal
 * page where `tab.url` may be withheld even with `activeTab` granted.
 */
export async function getActiveTabInfo(): Promise<ActiveTabInfo | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;

  return { url: tab.url, sourceType: detectSourceType(tab.url) };
}
