import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { getDocuments } from "@/lib/actions/room.actions";
import { getOrCreateWorkspace } from "@/lib/actions/workspace.actions";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import AddDocumentBtn from "@/components/dashboard/add-document-btn";
import DocumentsSection from "@/components/dashboard/documents-section";
import MobileSidebar from "@/components/dashboard/mobile-sidebar";
import UserButton from "@/components/shared/user-button";
import Notifications from "@/components/shared/notifications";
import Sidebar from "@/components/dashboard/sidebar";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const user = session.user;

  const { filter } = await searchParams;

  const roomDocuments = await getDocuments(user.email);
  const allDocs: RoomDocument[] = roomDocuments?.data ?? [];
  const docCount = allDocs.length;

  // Server-side filter
  let filteredDocs = allDocs;
  if (filter === "recent") {
    filteredDocs = [...allDocs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }

  const workspaceData = await getOrCreateWorkspace(user.id, user.name);

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
                  {filter === "recent" ? "Recent" : "Document Studio"}
                </h1>
                <AddDocumentBtn userId={user.id} email={user.email} workspaceId={workspaceData.id} />
              </div>
              <div className="flex items-center justify-between">
                <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                  {filter === "recent"
                    ? "Your 10 most recently created documents."
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
            <DocumentsSection
              documents={filteredDocs}
              userId={user.id}
              email={user.email}
              workspaceId={workspaceData.id}
              activeFilter={filter ?? "all"}
            />

            {/* Bottom Bento Widgets — hidden on recent filter */}
            {filter !== "recent" && (
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
                      {docCount} document{docCount !== 1 ? "s" : ""} in your
                      workspace.
                    </p>
                    <Link
                      href="/profile"
                      className="group/link mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                    >
                      View Profile
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
