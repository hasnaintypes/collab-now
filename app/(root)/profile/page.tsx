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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const user = session.user;

  const roomDocuments = await getDocuments(user.email);
  const docCount = roomDocuments?.data?.length || 0;

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

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-24 pt-10 md:px-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>

        {/* Profile Header */}
        <section className="mb-16 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col items-start gap-8 md:flex-row md:items-center">
            <div className="relative group">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name}
                  className="size-36 rounded-none object-cover grayscale brightness-105 md:size-48"
                />
              ) : (
                <div className="flex size-36 items-center justify-center bg-muted text-4xl font-bold text-muted-foreground md:size-48 md:text-5xl">
                  {getInitials(user.name)}
                </div>
              )}
              <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="space-y-2">
              <h1 className="text-5xl font-extrabold tracking-tighter md:text-7xl">
                {user.name}
              </h1>
              <p className="text-lg uppercase tracking-widest text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
          <div className="pb-2">
            <ProfileForm name={user.name} image={user.image || ""} />
          </div>
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
            <section className="space-y-8">
              <h2 className="text-2xl font-bold tracking-tight">
                Personal Information
              </h2>
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
                    {dateConverter(user.createdAt.toString())}
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
            </section>
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
