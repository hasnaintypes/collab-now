# Collab Now

A real-time collaborative document editor for modern teams. Create, edit, and share rich-text documents with live presence, inline comments, and granular access control.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | [Next.js 15+](https://nextjs.org) (App Router) | Server components, routing, API routes |
| Language | [TypeScript](https://www.typescriptlang.org) | End-to-end type safety |
| Real-Time | [Liveblocks](https://liveblocks.io) | Presence, live storage, notifications |
| Editor | [Lexical](https://lexical.dev) | Extensible rich-text editing engine |
| UI Components | [shadcn/ui](https://ui.shadcn.com) | Accessible, unstyled component primitives |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) | Utility-first CSS, CSS-first configuration |
| Authentication | [NextAuth.js](https://next-auth.js.org) | GitHub OAuth, session management |

---

## Features

**Authentication**
Sessions are secured with OAuth 2.0 and server-side token validation.

**Real-Time Collaboration**
Edit documents simultaneously with multiple users. All changes are propagated instantly using Liveblocks' conflict-free real-time infrastructure.

**Document Management**
- Create documents with automatic saving
- Delete documents you own
- Browse all owned and shared documents with search and sort

**Sharing and Permissions**
Share documents via email or a generated link. Assign view-only or editor permissions per collaborator.

**Inline and Threaded Comments**
Annotate any text selection with inline comments. Replies are nested in threads, keeping discussions contextual.

**Active Collaborator Presence**
Real-time avatar indicators show who is currently viewing or editing a document.

**Notifications**
In-app alerts for document shares, new comments, and collaborator activity.

**Responsive Design**
Mobile-first layout that adapts to desktops, tablets, and phones.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18.17 or later
- [pnpm](https://pnpm.io) 8 or later
- A [Liveblocks](https://liveblocks.io) account
- A [GitHub OAuth App](https://github.com/settings/developers) for authentication

### Environment Variables

Create a `.env.local` file in the project root:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Liveblocks
LIVEBLOCKS_SECRET_KEY=your_liveblocks_secret_key
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=your_liveblocks_public_key
```

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/collab-now.git
cd collab-now

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
pnpm build
pnpm start
```

---

## Project Structure

```
collab-now/
├── app/
│   ├── (auth)/               # Sign-in and sign-up routes
│   ├── (root)/               # Authenticated app routes
│   │   └── documents/[id]/   # Individual document editor
│   ├── api/
│   │   └── liveblocks-auth/  # Liveblocks authentication endpoint
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── custom/               # App-specific components
│   │   ├── CollaborativeRoom.tsx
│   │   ├── Header.tsx
│   │   ├── ShareModal.tsx
│   │   └── ...
│   ├── editor/               # Lexical editor setup
│   │   ├── Editor.tsx
│   │   └── plugins/
│   └── ui/                   # shadcn/ui components
├── lib/
│   ├── actions/              # Server actions
│   └── utils.ts
└── middleware.ts              # Route protection
```

---

## Contributing

Contributions are welcome. Please open an issue to discuss your proposed change before submitting a pull request.

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org)
4. Open a pull request against `main`

---

## License

[MIT](LICENSE)
