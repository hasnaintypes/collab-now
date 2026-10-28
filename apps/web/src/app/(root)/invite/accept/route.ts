import { NextResponse, type NextRequest } from "next/server";
import { acceptInvite } from "@/features/workspace/actions/workspace.actions";

// This used to be a page.tsx that called `acceptInvite` directly from its
// render body — which calls `revalidateTag` internally. Next disallows
// revalidateTag/updateTag during a page's render (there's no action
// dispatch boundary when a Server Component just `await`s a "use server"
// function inline — it's a plain function call happening mid-render), so
// every accept-invite click threw a console error, even though the DB
// writes themselves succeeded. Route Handlers aren't part of render, so
// the same `acceptInvite` call (and its revalidateTag calls) are fine
// here — this is the Next-recommended shape for a mutation reached via a
// plain GET link (an email's "Accept Invite" button) rather than a form
// submission.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL(
        `/invite/error?message=${encodeURIComponent("No invite token was provided.")}`,
        request.url
      )
    );
  }

  const result = await acceptInvite(token);

  if (!result.success) {
    return NextResponse.redirect(
      new URL(
        `/invite/error?message=${encodeURIComponent(result.error)}`,
        request.url
      )
    );
  }

  if (result.data.outcome === "joined") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.redirect(
    new URL(
      `/sign-up?redirect=${encodeURIComponent(`/invite/accept?token=${token}`)}`,
      request.url
    )
  );
}
