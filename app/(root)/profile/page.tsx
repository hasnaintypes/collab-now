import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import {
  FileText,
  Users,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getDocuments } from "@/lib/actions/room.actions";
import { dateConverter } from "@/lib/utils";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import UserButton from "@/components/shared/user-button";
import Notifications from "@/components/shared/notifications";
import ProfileForm from "@/components/profile/profile-form";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const user = session.user;

  const roomDocuments = await getDocuments(user.email);
  const docCount = roomDocuments?.data?.length || 0;

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

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-24 pt-10 md:px-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>

        {/* Profile Header — avatar + name are inline-editable via ProfileForm */}
        <section className="mb-16 flex flex-col items-start gap-8 md:flex-row md:items-center">
          <ProfileForm
            name={user.name}
            email={user.email}
            image={user.image || ""}
          />
        </section>

        <div className="grid grid-cols-1 gap-x-16 gap-y-16 lg:grid-cols-12">
          {/* Left Column */}
          <div className="space-y-16 lg:col-span-8">
            {/* Stats Bento Grid */}
            <div className="grid grid-cols-1 gap-px md:grid-cols-3">
              <div className="flex aspect-square flex-col justify-between bg-muted/50 p-8 transition-colors hover:bg-muted">
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Documents Created
                </span>
                <div className="flex items-end gap-3">
                  <FileText className="mb-1 size-6 text-muted-foreground" />
                  <span className="text-5xl font-bold tracking-tighter">
                    {docCount}
                  </span>
                </div>
              </div>
              <div className="flex aspect-square flex-col justify-between bg-muted/50 p-8 transition-colors hover:bg-muted">
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Active Collaborations
                </span>
                <div className="flex items-end gap-3">
                  <Users className="mb-1 size-6 text-muted-foreground" />
                  <span className="text-5xl font-bold tracking-tighter">
                    {docCount}
                  </span>
                </div>
              </div>
              <div className="flex aspect-square flex-col justify-between bg-muted/50 p-8 transition-colors hover:bg-muted">
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Total Comments
                </span>
                <div className="flex items-end gap-3">
                  <MessageSquare className="mb-1 size-6 text-muted-foreground" />
                  <span className="text-5xl font-bold tracking-tighter">
                    0
                  </span>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
              <div className="space-y-1.5 border-b border-border/50 pb-4">
                <label className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Full Name
                </label>
                <p className="text-base">{user.name}</p>
              </div>
              <div className="space-y-1.5 border-b border-border/50 pb-4">
                <label className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Email Address
                </label>
                <p className="text-base">{user.email}</p>
              </div>
              <div className="space-y-1.5 border-b border-border/50 pb-4">
                <label className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Member Since
                </label>
                <p className="text-base">
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="space-y-1.5 border-b border-border/50 pb-4">
                <label className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Account Status
                </label>
                <p className="text-base">
                  {user.emailVerified ? "Verified" : "Unverified"}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-16 lg:col-span-4">
            {/* Recent Documents */}
            <section className="space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-widest">
                Recent Documents
              </h2>
              <div className="space-y-6">
                {roomDocuments?.data?.length > 0 ? (
                  roomDocuments.data
                    .slice(0, 5)
                    .map(
                      (doc: {
                        id: string;
                        metadata: { title: string };
                        createdAt: string;
                      }) => (
                        <Link
                          key={doc.id}
                          href={`/documents/${doc.id}`}
                          className="flex items-start gap-4"
                        >
                          <div className="mt-1 size-2 shrink-0 bg-primary" />
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium underline underline-offset-4 decoration-border">
                              {doc.metadata.title}
                            </p>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              {dateConverter(doc.createdAt)}
                            </p>
                          </div>
                        </Link>
                      )
                    )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No documents yet
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
