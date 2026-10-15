/**
 * Base URL of the CollabNow web app this extension talks to. `VITE_*` env
 * vars are inlined at build time by Vite (see `.env.example` in this
 * package) — defaults to local dev so `pnpm --filter extension dev` works
 * out of the box without any env file.
 */
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:3000";
