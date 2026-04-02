import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { FileText, Share2, Trash2, LayoutGrid, List, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { getDocuments } from "@/lib/actions/room.actions";
import { dateConverter } from "@/lib/utils";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import AddDocumentBtn from "@/components/dashboard/add-document-btn";
import DeleteDocumentDialog from "@/components/dashboard/delete-document-dialog";
import UserButton from "@/components/shared/user-button";
import Notifications from "@/components/shared/notifications";
import Sidebar from "@/components/dashboard/sidebar";

interface RoomDocument {
  id: string;
  metadata: { title: string };
  createdAt: string;
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const user = session.user;

  const roomDocuments = await getDocuments(user.email);
  const docCount = roomDocuments?.data?.length || 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Nav */}
      <DashboardHeader>
        <Notifications />
        <AddDocumentBtn userId={user.id} email={user.email} />
        <UserButton
          name={user.name}
          email={user.email}
          avatar={user.image || ""}
        />
      </DashboardHeader>

      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 md:ml-64">
          <div className="mx-auto max-w-6xl px-6 pb-16 pt-12 md:px-8">
            {/* Hero / Headline */}
            <header className="mb-20">
              <h1 className="mb-4 text-5xl font-extrabold leading-tight tracking-tighter md:text-6xl">
                Document Studio
              </h1>
              <div className="flex items-center justify-between">
                <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                  Organize your collaborative thoughts in an editorial
                  environment designed for focus.
                </p>
                {docCount > 0 && (
                  <span className="hidden text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground md:inline">
                    {docCount} document{docCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </header>

            {/* Documents Section */}
            <section>
              <div className="mb-8 flex items-center justify-between px-2">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  All Documents
                </h2>
                <div className="flex gap-4 text-muted-foreground">
                  <LayoutGrid className="size-5 cursor-pointer transition-colors hover:text-foreground" />
                  <List className="size-5 cursor-pointer text-foreground" />
                </div>
              </div>

              {roomDocuments?.data?.length > 0 ? (
                <div className="space-y-3">
                  {roomDocuments.data.map(
                    ({ id, metadata, createdAt }: RoomDocument) => (
                      <div
                        key={id}
                        className="group flex items-center justify-between rounded-sm bg-muted/40 p-5 transition-all duration-300 hover:bg-card hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
                      >
                        <Link
                          href={`/documents/${id}`}
                          className="flex flex-1 items-center gap-5"
                        >
                          <div className="flex size-12 shrink-0 items-center justify-center rounded-sm bg-muted">
                            <FileText className="size-5 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold tracking-tight">
                              {metadata.title}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Created {dateConverter(createdAt)}
                            </p>
                          </div>
                        </Link>

                        <div className="flex items-center gap-6">
                          {/* Hover actions */}
                          <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                            <Link
                              href={`/documents/${id}`}
                              className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <Share2 className="size-[18px]" />
                            </Link>
                            <DeleteDocumentDialog roomId={id} />
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border/50 py-24 text-center">
                  <div className="mb-5 flex size-16 items-center justify-center rounded-sm bg-muted">
                    <FileText className="size-8 text-muted-foreground" />
                  </div>
                  <h2 className="mb-2 text-xl font-bold tracking-tight">
                    No documents yet
                  </h2>
                  <p className="mb-8 max-w-sm text-sm text-muted-foreground">
                    Create your first document to start collaborating with your
                    team.
                  </p>
                  <AddDocumentBtn userId={user.id} email={user.email} />
                </div>
              )}
            </section>

            {/* Bottom Bento Widgets */}
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
          </div>
        </main>
      </div>
    </div>
  );
}
