/**
 * CORS handling for the small set of API routes the browser extension
 * (`apps/extension`) calls directly (P2-6) — everything else in this app
 * is same-origin (server actions, or pages/route handlers only ever called
 * from the web app itself), so this is deliberately scoped to
 * `apps/web/src/app/api/extension/*` rather than a blanket `next.config.ts`
 * `headers()` rule that would apply to every route.
 *
 * Allows any `chrome-extension://` origin rather than one specific
 * extension ID: during development an unpacked extension's ID is
 * regenerated per machine/load unless a fixed `key` is pinned in
 * `manifest.json`, so there's no single ID to allowlist yet. Once this
 * extension is published to the Chrome Web Store and has a stable ID,
 * tighten this to compare against that exact origin (e.g. via an env var)
 * instead of the whole `chrome-extension://` scheme — tracked as a
 * follow-up, not blocking P2-6 itself.
 */

const EXTENSION_ORIGIN_PREFIX = "chrome-extension://";

export function extensionCorsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "x-api-key, Content-Type",
    // No `Access-Control-Allow-Credentials` — these routes authenticate via
    // the `x-api-key` header, never cookies, so there's nothing to allow.
  };

  if (origin?.startsWith(EXTENSION_ORIGIN_PREFIX)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }

  return headers;
}
