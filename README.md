# CollabNow

A real-time collaborative document editor built for modern teams. Create, edit, and share documents with live presence, inline comments, and granular access control.

## Tech Stack

| Layer | Technology |
|:---:|:---|
| **Framework** | Next.js 16 + React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 + shadcn/ui |
| **Auth** | Better Auth (email/password) |
| **Database** | PostgreSQL (NeonDB) + Drizzle ORM |
| **Real-time** | Liveblocks + Lexical Editor |
| **Email** | Nodemailer (SMTP) |
| **Package Manager** | pnpm |

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
- pnpm
- PostgreSQL database (NeonDB recommended)
- Liveblocks account
- SMTP credentials (for email invites)

### Environment Variables

Create a `.env.local` file:

```env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:3000
LIVEBLOCKS_SECRET_KEY=sk_...
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
EMAIL_FROM=noreply@example.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation

```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm dev
```

## Project Structure

```
app/
├── (auth)/              Sign-in, sign-up
├── (root)/              Dashboard, editor, profile, settings, help
├── api/                 Auth + Liveblocks endpoints
└── page.tsx             Landing page

components/
├── dashboard/           Sidebar, header, document list, invite dialog
├── document/            Collaborative room, share dialog
├── editor/              Lexical editor, toolbar, floating toolbar, plugins
├── home/                Landing page sections
├── settings/            Settings page content
├── shared/              Notifications, user button, comments, loader
└── ui/                  shadcn/ui primitives

lib/
├── actions/             Server actions (rooms, users, workspaces)
├── auth.ts              Better Auth config
├── liveblocks.ts        Liveblocks client
└── mail.ts              Email transport

db/
├── schema/              Drizzle schema (auth + app tables)
└── index.ts             Database client
```

## Scripts

| Command | Description |
|:---|:---|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio |

## License

MIT
