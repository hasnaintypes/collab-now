import { eq } from "drizzle-orm";
import { db, user } from "@collabnow/db";
import { auth } from "@/features/auth/lib";

export type ExtensionUser = { id: string; name: string; email: string };

/**
 * Shared personal-access-token resolution for every `/api/extension/*`
 * route (P2-6's `me`, P2-7's `generate`/`jobs/[id]`) — pulled out of `me`'s
 * original inline version so a second/third route didn't each re-implement
 * the same "read `x-api-key`, verify it, look up the user it belongs to"
 * steps. Reads only the `x-api-key` header, never a cookie, per FR-16.
 *
 * Returns the resolved user on success, or a ready-to-return `error`
 * message on failure — callers decide the response shape (status 401,
 * CORS headers) themselves since those are the same regardless of which
 * route is calling this.
 */
export async function authenticateExtensionRequest(
  request: Request
): Promise<
  { ok: true; user: ExtensionUser } | { ok: false; error: string }
> {
  const token = request.headers.get("x-api-key");
  if (!token) {
    return { ok: false, error: "Missing x-api-key header." };
  }

  const result = await auth.api.verifyApiKey({ body: { key: token } });
  if (!result.valid || !result.key) {
    return { ok: false, error: "Invalid or expired personal access token." };
  }

  const [account] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, result.key.referenceId))
    .limit(1);

  if (!account) {
    return { ok: false, error: "Invalid or expired personal access token." };
  }

  return { ok: true, user: account };
}
