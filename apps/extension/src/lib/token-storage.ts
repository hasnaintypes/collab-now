/**
 * Personal access token storage (P2-6 / PRD FR-16). Uses `chrome.storage
 * .local`, not `.sync` — a PAT is a long-lived credential, and syncing it
 * to every device signed into the same Google/Chrome account via Chrome
 * Sync would widen its blast radius well beyond "this one browser
 * install", which isn't what a user granting access on one machine expects.
 */

const STORAGE_KEY = "collabnow_pat";

export async function getToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const value = result[STORAGE_KEY];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function setToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: token });
}

export async function clearToken(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}
