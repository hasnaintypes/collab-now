import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Trash2,
  UserPlus,
  UserCheck,
  Share2,
  Archive,
  ArchiveRestore,
  Star,
} from "lucide-react";
import { auth } from "@/lib/auth";
import {
  getOrCreateWorkspace,
  getRecentActivity,
} from "@/lib/actions/workspace.actions";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import UserButton from "@/components/shared/user-button";
import Notifications from "@/components/shared/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { dateConverter } from "@/lib/utils";

const actionConfig: Record<
  string,
  { icon: typeof FileText; label: string; color: string }
> = {
  created: { icon: FileText, label: "created a document", color: "text-green-500" },
  deleted: { icon: Trash2, label: "deleted a document", color: "text-red-500" },
  shared: { icon: Share2, label: "shared a document", color: "text-blue-500" },
  invited: { icon: UserPlus, label: "invited a member", color: "text-violet-500" },
  joined: { icon: UserCheck, label: "joined the workspace", color: "text-emerald-500" },
  archived: { icon: Archive, label: "archived a document", color: "text-amber-500" },
  unarchived: { icon: ArchiveRestore, label: "unarchived a document", color: "text-amber-500" },
  starred: { icon: Star, label: "starred a document", color: "text-yellow-500" },
  unstarred: { icon: Star, label: "unstarred a document", color: "text-muted-foreground" },
};

export default async function ActivityPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const user = session.user;

  const workspaceData = await getOrCreateWorkspace(user.id, user.name);
  const activities = await getRecentActivity(workspaceData.id, 50);

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
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>

        <header className="mb-12">
          <h1 className="text-4xl font-extrabold tracking-tighter md:text-5xl">
            Activity
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Recent activity across your workspace.
          </p>
        </header>

        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-border/50 py-24 text-center">
            <div className="mb-5 flex size-16 items-center justify-center rounded-sm bg-muted">
              <FileText className="size-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-xl font-bold tracking-tight">
              No activity yet
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Activity will appear here as you and your team create, share, and
              collaborate on documents.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map(
              (activity: {
                id: string;
                action: string;
                metadata: string | null;
                createdAt: string;
                userName: string;
                userImage: string | null;
              }) => {
                const config = actionConfig[activity.action] || {
                  icon: FileText,
                  label: activity.action,
                  color: "text-muted-foreground",
                };
                const Icon = config.icon;
                const meta = activity.metadata
                  ? JSON.parse(activity.metadata)
                  : {};

                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 rounded-sm px-4 py-3.5 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className={`size-4 ${config.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-semibold">
                          {activity.userName}
                        </span>{" "}
                        {config.label}
                        {meta.title && (
                          <>
                            {" "}
                            <span className="font-medium">{meta.title}</span>
                          </>
                        )}
                        {meta.email && (
                          <>
                            {" "}
                            <span className="text-muted-foreground">
                              {meta.email}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {dateConverter(activity.createdAt)}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        )}
      </main>
    </div>
  );
}
