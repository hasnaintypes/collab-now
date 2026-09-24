import { eq } from "drizzle-orm";
import { db, user } from "@collabnow/db";
import { auth } from "@/features/auth/lib";
import { extensionCorsHeaders } from "@/lib/cors";

/**
 * P2-6: the extension calls this once (options page "test connection", and
 * the popup on open) to prove its stored personal access token actually
 * authenticates — the concrete demonstration of FR-16's "not via shared
 * browser session cookies" requirement, since this route reads only the
 * `x-api-key` header, never `request.headers.get("cookie")`.
 *
 * Deliberately its own route rather than reusing Better Auth's own
 * `/api/auth/get-session` — see the `apiKey()` plugin config comment in
 * `features/auth/lib/server.ts` for why `enableSessionForAPIKeys` isn't
 * used here.
 */
export async function GET(request: Request) {
  const headers = extensionCorsHeaders(request.headers.get("origin"));

  const token = request.headers.get("x-api-key");
  if (!token) {
    return Response.json(
      { error: "Missing x-api-key header." },
      { status: 401, headers }
    );
  }

  const result = await auth.api.verifyApiKey({ body: { key: token } });
  if (!result.valid || !result.key) {
    return Response.json(
      { error: "Invalid or expired personal access token." },
      { status: 401, headers }
    );
  }

  const [account] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, result.key.referenceId))
    .limit(1);

  if (!account) {
    return Response.json(
      { error: "Invalid or expired personal access token." },
      { status: 401, headers }
    );
  }

  return Response.json({ user: account }, { status: 200, headers });
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: extensionCorsHeaders(request.headers.get("origin")),
  });
}
