import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/features/auth/lib";
import {
  getOrCreateWorkspace,
  getRecentActivity,
} from "@/features/workspace/actions/workspace.actions";
import DashboardHeader from "@/components/layout/dashboard-header";
import UserButton from "@/components/shared/user-button";
import Notifications from "@/features/notifications/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import ActivityFeed from "@/features/activity/components/activity-feed";

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

        <ActivityFeed activities={activities} />
      </main>
    </div>
  );
}
