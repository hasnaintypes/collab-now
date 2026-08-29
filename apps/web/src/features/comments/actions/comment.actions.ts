"use server";

import { headers } from "next/headers";
import { auth } from "@/features/auth/lib";
import { checkRateLimit, formatRetryAfter, RATE_LIMITS } from "@/lib/rate-limit";

// Comments are posted directly from the client to Liveblocks via `<Composer>`
// (see `features/comments/components/comments.tsx`) — there is no CollabNow
// server action in that write path to attach a hard rate limit to. This is a
// soft, best-effort gate called from `Composer`'s `onComposerSubmit` before
// the default submit behavior runs: it stops the honest-client spam case
// (accidental double-posting, runaway scripts against our own UI) but a
// malicious client holding a valid Liveblocks room token could still call
// Liveblocks' API directly and bypass it. Hardening that further would
// require proxying comment writes through our own API instead of the
// Liveblocks client SDK — worth its own follow-up issue if needed
// (see docs/ROADMAP.md P0-6).
export async function checkCommentRateLimit(): Promise<{
  allowed: boolean;
  error?: string;
}> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { allowed: false, error: "You must be signed in to comment." };
  }

  const rateLimit = await checkRateLimit(
    RATE_LIMITS.commentCreate,
    session.user.id
  );
  if (!rateLimit.success) {
    return {
      allowed: false,
      error: `You're commenting too quickly. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds!)}.`,
    };
  }

  return { allowed: true };
}
