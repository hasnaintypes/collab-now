import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { auth } from "@/features/auth/lib";
import {
  getDocumentsForUser,
  getDocumentCountForUser,
} from "@/features/documents/actions/room.actions";
import {
  getOrCreateWorkspace,
  getWorkspaceMembers,
} from "@/features/workspace/actions/workspace.actions";
import DashboardHeader from "@/components/layout/dashboard-header";
import AddDocumentBtn from "@/features/documents/components/add-document-btn";
import DocumentsSection from "@/features/documents/components/documents-section";
import MobileSidebar from "@/features/workspace/components/mobile-sidebar";
import UserButton from "@/components/shared/user-button";
import Notifications from "@/features/notifications/components/notifications";
import Sidebar from "@/features/workspace/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import type { DocumentFilter } from "@/features/documents/types";

const VALID_FILTERS: DocumentFilter[] = ["recent", "starred", "shared", "archived", "all"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const user = session.user;

  const { filter: rawFilter } = await searchParams;
  const filter: DocumentFilter = VALID_FILTERS.includes(rawFilter as DocumentFilter)
    ? (rawFilter as DocumentFilter)
    : "all";

  const [{ documents: filteredDocs, nextCursor }, docCount, workspaceData] =
    await Promise.all([
      getDocumentsForUser(user.id, { filter }),
      getDocumentCountForUser(user.id),
      getOrCreateWorkspace(user.id, user.name),
    ]);
  const members = await getWorkspaceMembers(workspaceData.id);

  const sidebarProps = {
    workspaceName: workspaceData.name,
    workspaceRole: workspaceData.role,
    memberCount: workspaceData.memberCount,
    workspaceId: workspaceData.id,
    userId: user.id,
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Nav */}
      <DashboardHeader
        mobileSidebar={<MobileSidebar {...sidebarProps} />}
      >
        <ThemeToggle />
        <Notifications />
        <UserButton
          name={user.name}
          email={user.email}
          avatar={user.image || ""}
        />
      </DashboardHeader>

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar {...sidebarProps} />

        {/* Main Content */}
        <main className="flex-1 md:ml-64">
          <div className="mx-auto max-w-6xl px-6 pb-16 pt-12 md:px-8">
            {/* Hero / Headline */}
            <header className="mb-20">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-5xl font-extrabold leading-tight tracking-tighter md:text-6xl">
                  {filter === "recent"
                    ? "Recent"
                    : filter === "starred"
                      ? "Starred"
                      : filter === "shared"
                        ? "Shared with Me"
                        : filter === "archived"
                          ? "Archive"
                          : "Document Studio"}
                </h1>
                <AddDocumentBtn userId={user.id} email={user.email} workspaceId={workspaceData.id} />
              </div>
              <div className="flex items-center justify-between">
                <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                  {filter === "recent"
                    ? "Your 10 most recently created documents."
                    : filter === "starred"
                      ? "Documents you've marked as important."
                      : filter === "shared"
                        ? "Documents others have shared with you."
                        : filter === "archived"
                          ? "Documents you've moved to the archive."
                          : "Organize your collaborative thoughts in an editorial environment designed for focus."}
                </p>
                {docCount > 0 && (
                  <span className="hidden text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground md:inline">
                    {docCount} / 50 documents
                  </span>
                )}
              </div>
            </header>

            {/* Documents Section */}
            {/* Keyed by filter so switching tabs remounts with a clean pagination/search state */}
            <DocumentsSection
              key={filter}
              documents={filteredDocs}
              nextCursor={nextCursor}
              userId={user.id}
              email={user.email}
              workspaceId={workspaceData.id}
              activeFilter={filter}
              currentUser={{
                name: user.name,
                email: user.email,
                avatar: user.image || "",
              }}
            />

            {/* Bottom Bento Widgets — hidden outside the default "all" view */}
            {filter === "all" && (
              <section className="mt-20 grid grid-cols-1 gap-6 md:grid-cols-12">
                {/* Storage Widget */}
                <div className="group relative overflow-hidden rounded-sm bg-muted/40 p-10 md:col-span-8">
                  <div className="relative z-10">
                    <h3 className="mb-8 text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Workspace Intelligence
                    </h3>
                    <div className="flex items-end gap-10">
                      <div>
                        <span className="text-5xl font-extrabold tracking-tighter">
                          {docCount}
                        </span>
                        <p className="mt-2 text-sm font-medium text-muted-foreground">
                          Documents created
                        </p>
                      </div>
                      <div className="mb-2 flex-1 space-y-2">
                        <div className="h-1 overflow-hidden rounded-full bg-border">
                          <div
                            className="h-full bg-foreground transition-all duration-500"
                            style={{
                              width: `${Math.min((docCount / 50) * 100, 100)}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          <span>{docCount} created</span>
                          <span>50 limit</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Widget */}
                <div className="flex flex-col justify-between rounded-sm bg-primary p-10 text-primary-foreground md:col-span-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/50">
                    Collaborator Activity
                  </h3>
                  <div className="mt-10">
                    <p className="text-2xl font-bold leading-tight tracking-tight">
                      {members.length} Team {members.length === 1 ? "member" : "members"} active now.
                    </p>
                    <Link
                      href="/profile"
                      className="group/link mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                    >
                      View Activity
                      <ArrowRight className="size-4 transition-transform group-hover/link:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
