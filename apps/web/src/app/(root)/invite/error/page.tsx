import Link from "next/link";

// Purely presentational — no Server Action call, no revalidation, nothing
// that touches the cache. `/invite/accept/route.ts` does the actual
// mutation (and the revalidateTag calls that go with it) and redirects
// here afterward on any non-success outcome. See that file for why: Next
// disallows revalidateTag/updateTag during a page's render, which this
// flow used to hit directly (acceptInvite was called inline from this
// page's render body).
export default async function InviteErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">
          Invite Expired
        </h1>
        <p className="mb-6 text-muted-foreground">
          {message || "This invite is no longer valid."}
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
