import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/features/auth/lib";
import {
  getOrCreateWorkspace,
  getWorkspaceMembers,
} from "@/features/workspace/actions/workspace.actions";
import DashboardHeader from "@/components/layout/dashboard-header";
import UserButton from "@/components/shared/user-button";
import Notifications from "@/features/notifications/components/notifications";
import SettingsContent from "@/features/settings/components/settings-content";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const user = session.user;

  const workspaceResult = await getOrCreateWorkspace(user.id, user.name);
  if (!workspaceResult.success) {
    throw new Error(workspaceResult.error);
  }
  const workspaceData = workspaceResult.data;

  // Member list failures degrade to an empty list rather than failing the
  // whole page — the rest of Settings is still useful without it.
  const membersResult = await getWorkspaceMembers(workspaceData.id);
  const members = membersResult.success ? membersResult.data : [];

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
            Settings
          </h1>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Manage your account preferences and workspace configuration.
          </p>
        </header>

        <SettingsContent
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image || "",
            createdAt: user.createdAt.toString(),
          }}
          workspace={{
            id: workspaceData.id,
            name: workspaceData.name,
            role: workspaceData.role,
            memberCount: workspaceData.memberCount,
          }}
          members={members}
        />
      </main>
    </div>
  );
}
