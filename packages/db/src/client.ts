import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const FETCH_RETRY_ATTEMPTS = 3;
const FETCH_RETRY_BASE_DELAY_MS = 150;

/**
 * Retries a transient network failure (the underlying `fetch()` throwing —
 * e.g. `TypeError: fetch failed` with an ECONNRESET/AggregateError cause
 * from a dropped Wi-Fi packet or a DNS hiccup) rather than a real query
 * error. Neon's HTTP endpoint still returns a normal `Response` for
 * query-level failures (bad SQL, auth, etc.) — those aren't retried here,
 * only the case where the request never got a response at all.
 *
 * This showed up repeatedly across unrelated call sites in local dev
 * (sign-up, dashboard queries, Better Auth session/verification lookups,
 * document loads, password reset) because every one of them ultimately
 * goes through this one `neon()` client. Setting `neonConfig.fetchFunction`
 * here, globally, covers all of them in one place — including queries
 * issued internally by Better Auth's Drizzle adapter, which this app has
 * no other hook into.
 */
async function fetchWithRetry(
  ...args: Parameters<typeof fetch>
): ReturnType<typeof fetch> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= FETCH_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fetch(...args);
    } catch (error) {
      lastError = error;
      if (attempt < FETCH_RETRY_ATTEMPTS) {
        await new Promise((resolve) =>
          setTimeout(resolve, FETCH_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
        );
      }
    }
  }
  throw lastError;
}

neonConfig.fetchFunction = fetchWithRetry;

let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb() {
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL!);
    _db = drizzle({ client: sql, schema });
  }
  return _db;
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    return getDb()[prop as keyof typeof _db];
  },
});
