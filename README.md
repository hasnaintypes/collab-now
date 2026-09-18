# CollabNow

[![CI](https://github.com/hasnaintypes/collab-now/actions/workflows/ci.yml/badge.svg)](https://github.com/hasnaintypes/collab-now/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#license)

A real-time collaborative document editor built for modern teams. Create, edit, and share documents with live presence, inline comments, and granular access control — or paste a YouTube video / article URL and let Gemini turn it into an editable, AI-generated notes document.

This repo is a **Turborepo monorepo** with a feature-based (screaming architecture) app structure.

**Status:** Core collaboration and the AI notes-from-URL MVP are shipped and in active use. Multiple note styles, "Ask about this" RAG chat, a functional browser extension, and Paddle billing are planned next — see [Roadmap](#roadmap).

## Tech Stack

| Layer | Technology |
|:---:|:---|
| **Monorepo** | Turborepo + pnpm workspaces |
| **Framework** | Next.js 16 + React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 + shadcn/ui |
| **Auth** | Better Auth (email/password) |
| **Database** | PostgreSQL (NeonDB, pgvector-enabled) + Drizzle ORM |
| **Real-time** | Liveblocks + Lexical Editor |
| **AI** | Google Gemini API (`@google/genai`) |
| **Job Queue** | Inngest (durable async ingestion pipeline) |
| **Email** | Nodemailer (SMTP) |
| **Testing** | Vitest (unit/integration) + Playwright (E2E) |

## Features

| | Feature | Description |
|:---:|:---|:---|
| **01** | Real-time Editing | Multiple users edit simultaneously with live cursors and presence indicators |
| **02** | AI Notes from URL | Paste a YouTube or article URL — Gemini fetches, translates (Hindi/Urdu → English), and summarizes it into a new document |
| **03** | Rich Text Editor | Headings, bold, italic, lists, blockquotes, inline code with floating toolbar |
| **04** | Inline Comments | Threaded discussions with @mentions directly on selected text |
| **05** | Document Sharing | Granular per-document permissions — Editor or Viewer access |
| **06** | Workspace Teams | Owner/Admin/Member roles, email invitations with token verification |
| **07** | Notifications | Real-time inbox for mentions, replies, and access grants |
| **08** | Profile Management | Avatar upload, inline name editing, stats overview |
| **09** | Document Search | Debounced search with recent documents filter |
| **10** | Dark Mode | Full light/dark theme support via CSS variables (OKLch) |
| **11** | Responsive | Desktop sidebar + mobile sheet navigation |

> A browser extension (`apps/extension`) exists in the repo but is currently a **non-functional stub** — one-click "generate notes from the current tab" is planned for a later phase (see [Roadmap](#roadmap)).

## Getting Started

### Prerequisites

- Node.js 18+ (CI runs on 22)
- pnpm 10+
- PostgreSQL database (NeonDB recommended — the `pgvector` extension must be enabled for future chat/RAG work)
- Liveblocks account
- Gemini API key (for AI notes generation — [ai.google.dev](https://ai.google.dev))
- SMTP credentials (for email invites)

### Environment Variables

Create `apps/web/.env` (Next.js only loads env files from its own app directory, not the repo root):

```env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:3000

NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=
LIVEBLOCKS_SECRET_KEY=sk_...

UPLOADTHING_TOKEN=

GMAIL_USER=
GMAIL_APP_PASSWORD=

GEMINI_API_KEY=

INNGEST_DEV=1
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Billing is not yet wired to any feature — placeholders only (see Roadmap)
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
PADDLE_ENV=sandbox
```

See `apps/web/.env.example` for the full list, including optional Playwright E2E overrides.

### Installation

```bash
pnpm install
pnpm db:push
pnpm dev
```

`pnpm dev` runs only the `web` app. Use `pnpm dev:all` to also start the `extension` dev server.

Background jobs (P0-16, see `apps/web/src/lib/inngest/`) run through [Inngest](https://www.inngest.com/). To exercise them locally alongside `pnpm dev`, set `INNGEST_DEV=1` in `apps/web/.env` and run its dev server in a separate terminal — no `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` needed for local dev, but `INNGEST_DEV=1` is required: without it the SDK defaults to "cloud mode" and every `inngest.send()` fails immediately with "no signing key found", even against a running local dev server.

```bash
npx inngest-cli@latest dev
```

This opens a dashboard at `http://localhost:8288` that discovers functions served from `apps/web/src/app/api/inngest/route.ts` and lets you trigger/inspect test runs. The real ingestion job (`processIngestionJob` — paste a URL, get a document) additionally needs a working `GEMINI_API_KEY` to reach the notes-generation step.

## Project Structure

```
apps/
├── web/                        Next.js app
│   └── src/
│       ├── app/                 Routing only — thin pages/layouts/API routes
│       ├── features/            Feature modules (screaming architecture)
│       │   ├── auth/             Sign-in/up/verify-email, Better Auth config
│       │   ├── documents/        Document CRUD, sharing, star/archive
│       │   ├── editor/           Lexical editor, collaborative room, plugins
│       │   ├── comments/         Liveblocks threaded comments
│       │   ├── notifications/    Liveblocks inbox notifications
│       │   ├── workspace/        Workspace/team, invites, sidebar nav
│       │   ├── activity/         Workspace activity feed
│       │   ├── ingestion/        URL → transcript/article → Gemini notes → document (Inngest job)
│       │   ├── profile/          Profile page + avatar upload
│       │   ├── settings/         Settings page
│       │   ├── help/             Help/support content
│       │   └── marketing/        Marketing landing page sections
│       │       (each feature owns its own components/actions/types.ts)
│       ├── components/           Generic, cross-feature UI (ui/, layout/, shared/)
│       ├── lib/                  Cross-cutting infra (liveblocks, uploadthing, inngest, gemini, rate-limit, cache-tags, pagination, action-result, utils)
│       └── types/                Ambient global types shared by 3+ features
│
└── extension/                  Browser extension stub (Vite + React + MV3)
                                  — see Roadmap, not yet functional

packages/
├── db/                          @collabnow/db — Drizzle schema + client
├── email/                       @collabnow/email — Nodemailer + HTML templates
└── config/
    ├── eslint/                   @collabnow/eslint-config
    └── typescript/                @collabnow/typescript-config

docs/                           PRD.md, ROADMAP.md, DECISIONS.md — local-only planning docs (git-ignored)
```

## Scripts

Run from the repo root — Turborepo fans these out to the right workspace(s):

| Command | Description |
|:---|:---|
| `pnpm dev` | Start the web app dev server |
| `pnpm dev:all` | Start dev servers for all apps |
| `pnpm build` | Production build (all apps) |
| `pnpm lint` | Run ESLint across the workspace |
| `pnpm check-types` | Type-check across the workspace |
| `pnpm test` | Run Vitest unit/integration tests (`@collabnow/db` + `web`) |
| `pnpm test:e2e` | Run the Playwright E2E specs (`web` only; needs `apps/web/.env`) — the sign-in/create/edit smoke test, plus a "paste a URL → wait for the job → open the generated document" spec that additionally needs `npx inngest-cli@latest dev` running in a separate terminal and a real `GEMINI_API_KEY` set |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio |

To target a single workspace directly, use pnpm's `--filter`, e.g. `pnpm --filter web run build`.

## Testing

- **Unit/integration (Vitest):** `packages/db` covers schema invariants (cascade rules, uniqueness) via Drizzle's `getTableConfig` — no live DB needed. `apps/web`'s `*.actions.test.ts` files mock `@collabnow/db`, `next/cache`/`next/headers`, and `@/features/auth/lib` rather than hitting a real database. Not every action/module is covered — the goal was establishing the harness and pattern; follow the existing test files' mocking style when adding more.
- **E2E (Playwright):** `apps/web/e2e/` runs against a real dev server and a real Postgres/Liveblocks backend from `apps/web/.env` — there's no mocking at this layer. `global-setup.ts` seeds one verified test user directly into Postgres. Two specs exist: a sign in → create → edit → sign out smoke test, and an ingestion happy-path test (paste a URL → wait for the job → open the generated document) that additionally needs `npx inngest-cli@latest dev` running and a real `GEMINI_API_KEY`.

## CI

Every PR and push to `master` runs `pnpm lint` → `pnpm check-types` → `pnpm test` → `pnpm build` via GitHub Actions (`.github/workflows/ci.yml`). The Playwright E2E smoke test needs a real Postgres/Liveblocks backend, so it's wired as a separate `workflow_dispatch`-only job rather than blocking every PR.

## Roadmap

Work is tracked as GitHub issues, phased and labeled `phase-0` through `phase-4`:

| Phase | Scope | Status |
|:---|:---|:---:|
| **0 — Foundation** | Auth completeness, data-layer fixes, error handling, rate limiting, tests, CI, AI/billing infra prep | ✅ Shipped |
| **1 — Ingestion MVP** | Paste a YouTube/article URL → validated, translated, summarized (Gemini) → saved as a document | ✅ Shipped |
| **2 — Notes UX, Chat, Extension** | Additional note styles (Cornell, Mind-Map, Q&A, Executive Summary), "Ask about this" RAG chat, a functional browser extension | 🚧 Planned |
| **3 — Billing** | Paddle checkout, webhooks, usage tracking/enforcement | 🚧 Planned |
| **4 — Backlog** | Document templates, keyboard shortcuts, workspace-wide chat | 📋 Deferred |

See open/closed issues on GitHub for the full, itemized breakdown.

## License

MIT
