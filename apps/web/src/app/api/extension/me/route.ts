import { extensionCorsHeaders } from "@/lib/cors";
import { authenticateExtensionRequest } from "@/lib/extension-auth";

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

  const auth = await authenticateExtensionRequest(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401, headers });
  }

  return Response.json({ user: auth.user }, { status: 200, headers });
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: extensionCorsHeaders(request.headers.get("origin")),
  });
}
