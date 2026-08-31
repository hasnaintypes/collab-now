import { db } from "@collabnow/db";
import { sql } from "drizzle-orm";

// Unauthenticated on purpose — external uptime monitors (and load balancers)
// need to hit this without credentials. Deliberately returns no internal
// detail on failure (no stack traces, no connection info) beyond a generic
// per-check status, consistent with this app's rule of never leaking server
// internals to a caller outside the trust boundary.
export const dynamic = "force-dynamic";

async function checkDatabase(): Promise<{ status: "ok" | "error"; latencyMs: number }> {
  const start = Date.now();
  try {
    await db.execute(sql`select 1`);
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    console.error("Health check: database ping failed", error);
    return { status: "error", latencyMs: Date.now() - start };
  }
}

export async function GET() {
  const database = await checkDatabase();
  const healthy = database.status === "ok";

  return Response.json(
    {
      status: healthy ? "ok" : "error",
      timestamp: new Date().toISOString(),
      checks: { database },
    },
    { status: healthy ? 200 : 503 }
  );
}
