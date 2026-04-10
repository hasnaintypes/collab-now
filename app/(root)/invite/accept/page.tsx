import { redirect } from "next/navigation";
import Link from "next/link";
import { acceptInvite } from "@/lib/actions/workspace.actions";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tight">
            Invalid Invite Link
          </h1>
          <p className="mb-6 text-muted-foreground">
            No invite token was provided.
          </p>
          <Link
            href="/dashboard"
            className="rounded-sm bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const result = await acceptInvite(token);

  if (result.success) {
    redirect("/dashboard");
  }

  if (result.needsSignUp) {
    redirect(
      `/sign-up?redirect=${encodeURIComponent(`/invite/accept?token=${token}`)}`
    );
  }

  // Error state (expired / invalid)
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          Invite Expired
        </h1>
        <p className="mb-6 text-muted-foreground">
          {result.error || "This invite is no longer valid."}
        </p>
        <Link
          href="/dashboard"
          className="rounded-sm bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
