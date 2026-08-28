import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/features/auth/lib";
import {
  getDocumentsForUser,
  getDocumentCountForUser,
} from "@/features/documents/actions/room.actions";
import DashboardHeader from "@/components/layout/dashboard-header";
import UserButton from "@/components/shared/user-button";
import Notifications from "@/features/notifications/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import ProfileContent from "@/features/profile/components/profile-content";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const user = session.user;

  const [{ documents: recentDocuments }, docCount] = await Promise.all([
    getDocumentsForUser(user.id, { filter: "recent", limit: 5 }),
    getDocumentCountForUser(user.id),
  ]);

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

      <ProfileContent
        user={{
          name: user.name,
          email: user.email,
          image: user.image || "",
          createdAt: user.createdAt,
          emailVerified: user.emailVerified,
        }}
        docCount={docCount}
        recentDocuments={recentDocuments}
      />
    </div>
  );
}
