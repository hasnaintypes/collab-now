# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CollabNow is a real-time collaborative document editor (Notion/Google-Docs style). This repo is a **Turborepo monorepo** using pnpm workspaces, with a feature-based ("screaming architecture") structure inside the web app. Env files only live in `apps/web/.env` — Next.js does not load env files from the repo root.

Two planning docs in `docs/` drive current work: `docs/PRD.md` (product requirements for the in-progress AI notes-from-video/article + Paddle billing feature) and `docs/ROADMAP.md` (phased issue-tracking source of truth — supersedes `docs/GAP.md`, which will be deleted once Phase 0 closes).

## Commands

Run from the repo root — Turborepo fans these out to the right workspace(s).

```bash
pnpm install
pnpm db:push          # push Drizzle schema to DB (no migration files)
pnpm dev               # start the web app only
pnpm dev:all           # also starts apps/extension dev server
pnpm build
pnpm lint
pnpm check-types
pnpm db:generate       # generate Drizzle migrations
pnpm db:migrate
pnpm db:studio
```

To target a single workspace: `pnpm --filter web run build` (or `--filter @collabnow/db`, etc.).

There is currently **no test suite and no CI** configured in this repo (tracked as P0-11/P0-12 in `docs/ROADMAP.md`) — don't assume `pnpm test` exists.

## Architecture

### Monorepo layout

```
apps/
├── web/            Next.js 16 + React 19 app — the actual product
└── extension/       Browser extension (Vite + React + MV3) — currently a non-functional stub, see PRD §6.11

packages/
├── db/              @collabnow/db — Drizzle schema + Neon Postgres client, shared by name import
├── email/            @collabnow/email — Nodemailer + HTML templates
└── config/
    ├── eslint/        @collabnow/eslint-config
    └── typescript/    @collabnow/typescript-config
```

`packages/db` exports `db` (Drizzle client) and every schema table as named exports from `@collabnow/db`; schema types come from `@collabnow/db/schema`. Server code imports tables directly, e.g. `import { db, document, activityLog } from "@collabnow/db"`.

### apps/web structure (feature-based / screaming architecture)

```
src/app/          Routing only — thin pages/layouts/API routes, grouped as (auth) and (root)
src/features/      One directory per feature; each owns its own components/, actions/, types.ts
src/components/    Generic, cross-feature UI (ui/, layout/, shared/)
src/lib/           Cross-cutting infra (liveblocks, uploadthing, utils)
src/types/         Ambient types shared by 3+ features
```

Feature modules today: `auth`, `documents`, `editor`, `comments`, `notifications`, `workspace`, `activity`, `profile`, `settings`, `help`, `marketing`. When adding code, put it in the owning feature directory rather than `src/lib` unless it's genuinely cross-cutting infrastructure.

Server actions live under `features/<name>/actions/*.actions.ts` with a `"use server"` directive, e.g. `features/documents/actions/room.actions.ts`, `features/workspace/actions/workspace.actions.ts`. Error handling in existing actions is inconsistent (some catch-log-and-rethrow, some catch-and-swallow) — this is a known gap (`docs/ROADMAP.md` P0-7), not a pattern to imitate without checking the surrounding code first.

### Document storage: two sources of truth (important)

Documents are **dual-homed** between Liveblocks and Postgres, and this is a known architectural gap (not a deliberate design):

- **Liveblocks** (`liveblocks.createRoom` / `getRooms` / `getRoom`) is the room itself — real-time content, presence, per-user room access (`usersAccesses`), and room `metadata` (creatorId, email, title).
- **Postgres `document` table** (`packages/db/src/schema/app.ts`) stores the same document's title/creator/workspace plus `isArchived`, linked by `roomId`.
- The dashboard's primary document list is still fetched from **Liveblocks** (`getDocuments()` → `liveblocks.getRooms()`), while star/archive filtering queries **Postgres** separately, then results are merged client-side. When touching document listing/filtering code, be aware both sources must stay in sync, and prefer being explicit about which one you're reading/writing rather than assuming.
- `liveblocks.ts` in `src/lib` wraps the Liveblocks Node client in a lazy-init `Proxy` so `LIVEBLOCKS_SECRET_KEY` isn't read until first use.

### Auth

Better Auth (`apps/web/src/features/auth/lib/server.ts`), email/password only, `drizzleAdapter` against the same Postgres DB, `requireEmailVerification: true`. Verification emails send via `@collabnow/email`. Password reset and welcome-email templates exist in `@collabnow/email` but are **not currently wired** to Better Auth plugins (tracked as P0-1/P0-2) — don't assume they fire.

### Editor

Lexical (`@lexical/*`) + `@liveblocks/react-lexical` for CRDT-backed real-time collaboration. `features/editor/components/collaborative-room.tsx` is the room shell, already split into `document-navbar.tsx`, `document-sidebar.tsx`, `document-footer.tsx`, `editor.tsx` — keep it that way rather than re-merging concerns back into one file.

### Database

Drizzle ORM against Neon serverless Postgres. Schema files: `packages/db/src/schema/auth.ts` (Better Auth-managed: `user`, `session`, `account`, `verification`) and `packages/db/src/schema/app.ts` (product tables: `workspace`, `workspaceMember`, `workspaceInvite`, `document`, `documentCollaborator`, `documentStar`, `activityLog`). `pnpm db:push` pushes schema directly (no migration files checked in yet); `db:generate`/`db:migrate` exist as scripts but the project currently relies on `push` during development.

### Planned but not yet built

Per `docs/PRD.md` §6.8–6.12 and confirmed absent from the codebase: content ingestion (YouTube/article), Gemini-based notes generation, pgvector-backed chat/RAG, a functional browser extension, and Paddle billing. None of the corresponding tables (`ingestion_job`, `source_content`, `document_chunk`, `subscription`, `usage_counter`) or env vars (`GEMINI_API_KEY`, Paddle keys) exist yet — see `docs/ROADMAP.md` for the phased build order before writing code toward these features.

## Git & commits

- **Never add a `Co-Authored-By` trailer or any AI-attribution line to commit messages.** Commit messages should read as if written by the repo owner.
- Only commit when explicitly asked. Create new commits rather than amending, unless told otherwise.
- Reference the GitHub issue number in the commit/PR when the work closes one (e.g. `Closes #3`).

## Working conventions

- **This repo tracks work as GitHub issues**, sourced from `docs/ROADMAP.md`. When starting a task, check whether a corresponding issue exists; if the task isn't in the roadmap/issues yet, it's still fine to do exploratory work, but non-trivial changes should generally map back to an issue.
- **If you spot an unrelated problem while working** (bad convention, missing validation, a latent bug, something that contradicts this file) — do not silently fix it as a drive-by change. Stop, tell the user what you found and why it matters, and propose filing it as a GitHub issue (labelled appropriately, e.g. `bug`, `code-quality`, `security`). Only fix it inline if the user says to, or if it's trivially in-scope for the task already at hand (e.g. a typo in a line you're already editing).
- **Don't burn tokens re-verifying as you go.** For a task that isn't naturally split into sub-tasks/checkpoints, do the implementation work first and run `pnpm lint` / `pnpm check-types` / relevant tests once at the end, not after every file edit. Sub-tasks that are genuinely independent checkpoints (e.g. a multi-phase migration) can each get their own verification pass — use judgment.
- Favor production-grade patterns over the quickest thing that compiles: validate inputs at trust boundaries (server actions, API routes), handle the failure path explicitly, and think about how a change holds up under concurrent users / larger data volumes before calling it done — this is a real product with paying-customer intent (Paddle billing is on the roadmap), not a prototype.

## Security — no leaking secrets or server logic to the client

- **Never** reference a secret (`LIVEBLOCKS_SECRET_KEY`, `GMAIL_APP_PASSWORD`, `DATABASE_URL`, future `GEMINI_API_KEY`/Paddle keys, etc.) with a `NEXT_PUBLIC_` prefix or import it into a Client Component (`"use client"`) or anything shipped to the browser. Only `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` is meant to be public — everything else in `.env.example` is server-only.
- Server actions (`"use server"`) and API routes are the trust boundary — always re-check auth/ownership inside them; never rely on the client having already checked (a client-side check is UX, not security).
- Keep `apps/web/.env.example` up to date with every new env var (as a placeholder, never a real value) whenever one is introduced, so onboarding and CI stay accurate.
- Don't log secrets or full request/response bodies that might contain PII or tokens.

## Keeping docs in sync

- **`README.md`** should stay accurate for a new contributor: env vars, setup steps, feature list, and scripts. Update it when any of those change (new env var, new top-level script, new major feature shipped).
- **`CLAUDE.md`** (this file) should stay accurate about architecture reality, not aspiration — update it when a roadmap item lands (e.g. once P0-3 ships, remove the "dual source of truth" caveat; once P0-1/P0-2 ship, remove the "not currently wired" note).
- **`docs/ROADMAP.md`** is the issue-tracking source of truth. Once every Phase 0 issue (#1–#17, `P0-1`–`P0-17`) is closed, delete `docs/GAP.md`.
