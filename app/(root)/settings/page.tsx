import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOrCreateWorkspace } from "@/lib/actions/workspace.actions";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import UserButton from "@/components/shared/user-button";
import Notifications from "@/components/shared/notifications";
import SettingsContent from "@/components/settings/settings-content";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const user = session.user;

  const workspaceData = await getOrCreateWorkspace(user.id, user.name);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardHeader>
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
        />
      </main>
    </div>
  );
}
