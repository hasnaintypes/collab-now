import { getIngestionJobStatusForUser } from "@/features/ingestion/lib/job-service";
import { extensionCorsHeaders } from "@/lib/cors";
import { authenticateExtensionRequest } from "@/lib/extension-auth";

/**
 * P2-7 / PRD FR-17: the extension popup polls this for the job id
 * `/api/extension/generate` returned, to show inline queued/processing/
 * ready/failed status without leaving the popup, and to get `roomId` once
 * ready so it can deep-link into the resulting document. Same
 * `getIngestionJobStatusForUser` core (`features/ingestion/lib/job-
 * service.ts`) the web app's "New from URL" dialog polls via
 * `getIngestionJobStatus` — see that module's doc comment.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const headers = extensionCorsHeaders(request.headers.get("origin"));

  const auth = await authenticateExtensionRequest(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401, headers });
  }

  const { id } = await params;
  const result = await getIngestionJobStatusForUser({
    userId: auth.user.id,
    jobId: id,
  });

  return Response.json(result, { status: 200, headers });
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: extensionCorsHeaders(request.headers.get("origin")),
  });
}
