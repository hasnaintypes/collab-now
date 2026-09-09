# CollabNow

[![CI](https://github.com/hasnaintypes/collab-now/actions/workflows/ci.yml/badge.svg)](https://github.com/hasnaintypes/collab-now/actions/workflows/ci.yml)

A real-time collaborative document editor built for modern teams. Create, edit, and share documents with live presence, inline comments, and granular access control.

This repo is a **Turborepo monorepo** with a feature-based (screaming architecture) app structure.

## Tech Stack

| Layer | Technology |
|:---:|:---|
| **Monorepo** | Turborepo + pnpm workspaces |
| **Framework** | Next.js 16 + React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 + shadcn/ui |
| **Auth** | Better Auth (email/password) |
| **Database** | PostgreSQL (NeonDB) + Drizzle ORM |
| **Real-time** | Liveblocks + Lexical Editor |
| **Email** | Nodemailer (SMTP) |

## Features

| | Feature | Description |
|:---:|:---|:---|
| **01** | Real-time Editing | Multiple users edit simultaneously with live cursors and presence indicators |
| **02** | Rich Text Editor | Headings, bold, italic, lists, blockquotes, inline code with floating toolbar |
| **03** | Inline Comments | Threaded discussions with @mentions directly on selected text |
| **04** | Document Sharing | Granular per-document permissions — Editor or Viewer access |
| **05** | Workspace Teams | Owner/Admin/Member roles, email invitations with token verification |
| **06** | Notifications | Real-time inbox for mentions, replies, and access grants |
| **07** | Profile Management | Avatar upload, inline name editing, stats overview |
| **08** | Document Search | Debounced search with recent documents filter |
| **09** | Dark Mode | Full light/dark theme support via CSS variables (OKLch) |
| **10** | Responsive | Desktop sidebar + mobile sheet navigation |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10+
- PostgreSQL database (NeonDB recommended)
- Liveblocks account
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
```

See `apps/web/.env.example` for the full list.

### Installation

```bash
pnpm install
pnpm db:push
pnpm dev
```

`pnpm dev` runs only the `web` app. Use `pnpm dev:all` to also start the `extension` dev server.

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
│       │   ├── profile/          Profile page + avatar upload
│       │   ├── settings/         Settings page
│       │       └── marketing/        Marketing landing page sections
│       │       (each feature owns its own components/actions/types.ts)
│       ├── components/           Generic, cross-feature UI (ui/, layout/, shared/)
│       ├── lib/                  Cross-cutting infra (liveblocks, uploadthing, utils)
│       └── types/                Ambient global types shared by 3+ features
│
└── extension/                  Browser extension stub (Vite + React + MV3)
                                  — see docs/PRD.md §6.11, not yet functional

packages/
├── db/                          @collabnow/db — Drizzle schema + client
├── email/                       @collabnow/email — Nodemailer + HTML templates
└── config/
    ├── eslint/                   @collabnow/eslint-config
    └── typescript/                @collabnow/typescript-config

docs/                           GAP.md, PRD.md — local-only planning docs (git-ignored)
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
| `pnpm test:e2e` | Run the Playwright smoke test (`web` only; needs `apps/web/.env`) |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio |

To target a single workspace directly, use pnpm's `--filter`, e.g. `pnpm --filter web run build`.

## CI

Every PR and push to `master` runs `pnpm lint` → `pnpm check-types` → `pnpm test` → `pnpm build` via GitHub Actions (`.github/workflows/ci.yml`). The Playwright E2E smoke test needs a real Postgres/Liveblocks backend, so it's wired as a separate `workflow_dispatch`-only job rather than blocking every PR.

## License

MIT
