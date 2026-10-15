import { getOrCreateWorkspace } from "@/features/workspace/actions/workspace.actions";
import { enqueueIngestionJobForUser } from "@/features/ingestion/lib/job-service";
import { extensionCorsHeaders } from "@/lib/cors";
import { authenticateExtensionRequest } from "@/lib/extension-auth";

/**
 * P2-7 / PRD Flow A step 3: the extension popup's "Generate notes" button
 * hits this once, for the current tab's URL, to enqueue the same ingestion
 * job `enqueueIngestionJob` (the web app's "New from URL" dialog) creates —
 * `enqueueIngestionJobForUser` (`features/ingestion/lib/job-service.ts`) is
 * the shared core both call into, so there's exactly one queueing
 * implementation regardless of which surface started the job.
 *
 * Resolves the caller's workspace the same way the dashboard/settings pages
 * do (`getOrCreateWorkspace`) rather than requiring the extension to know a
 * workspace id up front — the extension has no workspace picker UI, so it
 * always targets whichever workspace that function deterministically
 * prefers for this user (their own, or their oldest membership).
 *
 * Response body is the `ActionResult<{ jobId: string }>` shape used
 * everywhere else in this app (`@/lib/action-result`) rather than mapping
 * every business failure to a distinct HTTP status — only request-level
 * problems (missing/invalid token, malformed body) get a non-200 status;
 * the popup branches on `.success` the same way every web app caller does.
 */
export async function POST(request: Request) {
  const headers = extensionCorsHeaders(request.headers.get("origin"));

  const auth = await authenticateExtensionRequest(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401, headers });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be JSON." },
      { status: 400, headers }
    );
  }

  const sourceUrl =
    typeof body === "object" && body !== null && "sourceUrl" in body
      ? (body as { sourceUrl: unknown }).sourceUrl
      : undefined;
  if (typeof sourceUrl !== "string" || !sourceUrl.trim()) {
    return Response.json(
      { error: "sourceUrl is required." },
      { status: 400, headers }
    );
  }

  const workspaceResult = await getOrCreateWorkspace(
    auth.user.id,
    auth.user.name
  );
  if (!workspaceResult.success) {
    return Response.json(
      { error: workspaceResult.error },
      { status: 500, headers }
    );
  }

  const result = await enqueueIngestionJobForUser({
    userId: auth.user.id,
    workspaceId: workspaceResult.data.id,
    sourceUrl: sourceUrl.trim(),
  });

  return Response.json(result, { status: 200, headers });
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: extensionCorsHeaders(request.headers.get("origin")),
  });
}
