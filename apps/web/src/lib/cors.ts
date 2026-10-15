/**
 * CORS handling for the small set of API routes the browser extension
 * (`apps/extension`) calls directly (P2-6) — everything else in this app
 * is same-origin (server actions, or pages/route handlers only ever called
 * from the web app itself), so this is deliberately scoped to
 * `apps/web/src/app/api/extension/*` rather than a blanket `next.config.ts`
 * `headers()` rule that would apply to every route.
 *
 * Deliberately does *not* reflect back every `chrome-extension://` origin:
 * that would let any other extension a user has installed — not just this
 * one — satisfy CORS on these routes too. The extension itself never needs
 * this header to begin with: its `host_permissions` entry for this origin
 * (see `apps/extension/public/manifest.json`) already exempts its own
 * fetches (from the background service worker, popup, and options page)
 * from CORS entirely, same-origin or not.
 *
 * `ALLOWED_EXTENSION_ORIGIN` is left unset until this extension is
 * published to the Chrome Web Store and has a stable ID (an unpacked
 * extension's ID is regenerated per machine/load unless a fixed `key` is
 * pinned in `manifest.json`, so there's no single ID to allowlist yet) —
 * until then, no origin is allowed and these routes are effectively
 * same-origin-only, which is strictly safer than allowlisting the whole
 * `chrome-extension://` scheme while buying the real extension nothing.
 */

const ALLOWED_EXTENSION_ORIGIN = process.env.ALLOWED_EXTENSION_ORIGIN;

export function extensionCorsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "x-api-key, Content-Type",
    // No `Access-Control-Allow-Credentials` — these routes authenticate via
    // the `x-api-key` header, never cookies, so there's nothing to allow.
  };

  if (ALLOWED_EXTENSION_ORIGIN && origin === ALLOWED_EXTENSION_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }

  return headers;
}
