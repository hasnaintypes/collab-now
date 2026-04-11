import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Users,
  Share2,
  MessageSquare,
  Shield,
  Keyboard,
  MousePointer,
  Pencil,
  Bell,
  Search,
  UserPlus,
  Mail,
} from "lucide-react";
import { auth } from "@/lib/auth";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import UserButton from "@/components/shared/user-button";
import Notifications from "@/components/shared/notifications";
import { ThemeToggle } from "@/components/theme-toggle";

const gettingStarted = [
  {
    icon: FileText,
    title: "Create a document",
    description:
      'Click the "New Document" button on your dashboard. Your document opens immediately in the editor where you can start writing.',
  },
  {
    icon: Share2,
    title: "Share with your team",
    description:
      'Open a document and click "Share" to invite collaborators by email. Choose between Editor (can edit) or Viewer (read-only) access.',
  },
  {
    icon: Users,
    title: "Collaborate in real-time",
    description:
      "Multiple people can edit the same document simultaneously. You'll see live cursors and presence indicators for everyone active.",
  },
  {
    icon: MessageSquare,
    title: "Leave comments",
    description:
      "Select text in the editor to leave inline comments. Start threaded discussions and mention collaborators with @.",
  },
];

const editorShortcuts = [
  { keys: "Ctrl + B", action: "Bold" },
  { keys: "Ctrl + I", action: "Italic" },
  { keys: "Ctrl + U", action: "Underline" },
  { keys: "Ctrl + Shift + S", action: "Strikethrough" },
  { keys: "Ctrl + Z", action: "Undo" },
  { keys: "Ctrl + Shift + Z", action: "Redo" },
];

const features = [
  {
    icon: Pencil,
    title: "Rich Text Editor",
    description:
      "Full formatting support including headings, bold, italic, underline, strikethrough, lists, blockquotes, and inline code. Use the toolbar or keyboard shortcuts.",
  },
  {
    icon: MousePointer,
    title: "Live Presence",
    description:
      "See who's currently viewing or editing a document in real-time. Active collaborators appear as avatars in the editor header.",
  },
  {
    icon: Shield,
    title: "Access Control",
    description:
      "Two permission levels per document: Editor (full read/write access) and Viewer (read-only with presence). The document creator can manage all permissions.",
  },
  {
    icon: UserPlus,
    title: "Workspace Invites",
    description:
      "Workspace owners and admins can invite new members by email. Invitees receive an email with a secure link to join your workspace.",
  },
  {
    icon: Bell,
    title: "Notifications",
    description:
      "Get notified when someone mentions you in a comment, replies to your thread, or grants you access to a document. Check the bell icon in the header.",
  },
  {
    icon: Search,
    title: "Document Search",
    description:
      "Quickly find documents by title using the search bar on your dashboard. Results update as you type with debounced filtering.",
  },
];

const faqs = [
  {
    question: "How many documents can I create?",
    answer:
      "Each workspace supports up to 50 documents. You can see your current usage in the Workspace Intelligence widget on the dashboard.",
  },
  {
    question: "Can I remove a collaborator from a document?",
    answer:
      "Yes. Open the document, click Share, and you'll see the list of collaborators. The document owner can remove any collaborator or change their role.",
  },
  {
    question: "What happens when I delete a document?",
    answer:
      "Deleting a document is permanent and cannot be undone. All collaborators will lose access and any comments or threads will be removed.",
  },
  {
    question: "How do workspace roles work?",
    answer:
      "There are three roles: Owner (full control, can invite), Admin (can invite members), and Member (can create and edit documents). Roles are assigned at the workspace level.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Documents are stored securely through Liveblocks with encrypted connections. Authentication is handled via Better Auth with secure session management.",
  },
];

export default async function HelpPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const user = session.user;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader>
        <ThemeToggle />
        <Notifications />
        <UserButton
          name={user.name}
          email={user.email}
          avatar={user.image || ""}
        />
      </DashboardHeader>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-24 pt-10 md:px-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>

        {/* Page Header */}
        <header className="mb-20">
          <h1 className="text-5xl font-extrabold leading-tight tracking-tighter md:text-6xl">
            Help Center
          </h1>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Everything you need to know about using CollabNow to create and
            collaborate on documents with your team.
          </p>
        </header>

        {/* Getting Started */}
        <section className="mb-20">
          <h2 className="mb-8 text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Getting Started
          </h2>
          <div className="grid grid-cols-1 gap-px md:grid-cols-2">
            {gettingStarted.map((item, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 bg-muted/40 p-8 transition-colors hover:bg-muted/60"
              >
                <div className="flex size-10 items-center justify-center rounded-sm bg-muted">
                  <item.icon className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="mb-2 text-base font-bold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Editor Shortcuts */}
        <section className="mb-20">
          <h2 className="mb-8 text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Keyboard Shortcuts
          </h2>
          <div className="overflow-hidden rounded-sm border border-border/50">
            {editorShortcuts.map((shortcut, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-border/50 px-6 py-4 last:border-b-0"
              >
                <span className="text-sm text-muted-foreground">
                  {shortcut.action}
                </span>
                <kbd className="rounded-sm bg-muted px-3 py-1.5 text-xs font-bold tracking-wide text-foreground">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mb-20">
          <h2 className="mb-8 text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Features
          </h2>
          <div className="space-y-px">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex gap-6 bg-muted/40 p-8 transition-colors hover:bg-muted/60"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-muted">
                  <feature.icon className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="mb-2 text-base font-bold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20">
          <h2 className="mb-8 text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border-b border-border/50 pb-6 last:border-b-0"
              >
                <h3 className="mb-2 text-base font-bold tracking-tight">
                  {faq.question}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="rounded-sm bg-primary p-10 text-primary-foreground">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/50">
            Need More Help?
          </h2>
          <div className="mt-8">
            <p className="text-2xl font-bold leading-tight tracking-tight">
              Can&apos;t find what you&apos;re looking for?
            </p>
            <p className="mt-3 text-sm text-primary-foreground/70">
              Reach out to us at{" "}
              <a
                href="mailto:support@collabnow.app"
                className="underline underline-offset-4"
              >
                support@collabnow.app
              </a>{" "}
              and we&apos;ll get back to you as soon as possible.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
