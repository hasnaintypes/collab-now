import { db, rateLimitBucket } from "@collabnow/db";
import { sql } from "drizzle-orm";

export type RateLimitConfig = {
  /** Stable name for this limiter; becomes part of the bucket's storage key. */
  name: string;
  /** Max number of calls allowed per window, per identifier. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Only present when `success` is false — seconds until the window resets. */
  retryAfterSeconds?: number;
};

/**
 * Postgres-backed fixed-window rate limiter (no Redis/Upstash dependency —
 * reuses the existing Neon DB, see docs/ROADMAP.md P0-6). One row per
 * `${config.name}:${identifier}` key in `rate_limit_bucket`; the
 * increment-or-reset decision happens inside a single atomic
 * `INSERT ... ON CONFLICT DO UPDATE`, so concurrent requests for the same key
 * can't race past the limit (Postgres serializes the upsert via the row's
 * primary-key lock).
 *
 * Deliberately generic/exported so future mutating endpoints (e.g. the
 * Phase 1 ingestion job submission) can reuse it without new infrastructure —
 * just add a new entry to `RATE_LIMITS` below and call this with a stable
 * per-user (or otherwise scoped) identifier.
 */
export async function checkRateLimit(
  config: RateLimitConfig,
  identifier: string
): Promise<RateLimitResult> {
  const key = `${config.name}:${identifier}`;
  const windowSeconds = config.windowMs / 1000;

  const [row] = await db
    .insert(rateLimitBucket)
    .values({ key, count: 1, windowStart: new Date() })
    .onConflictDoUpdate({
      target: rateLimitBucket.key,
      set: {
        count: sql`case
          when ${rateLimitBucket.windowStart} <= now() - make_interval(secs => ${windowSeconds})
          then 1
          else ${rateLimitBucket.count} + 1
        end`,
        windowStart: sql`case
          when ${rateLimitBucket.windowStart} <= now() - make_interval(secs => ${windowSeconds})
          then now()
          else ${rateLimitBucket.windowStart}
        end`,
      },
    })
    .returning({
      count: rateLimitBucket.count,
      windowStart: rateLimitBucket.windowStart,
    });

  // Defensive fallback — `.returning()` on an upsert always yields the
  // affected row, so this should be unreachable in practice. Fail open rather
  // than blocking a legitimate request on an unexpected empty result.
  if (!row) {
    return { success: true, limit: config.limit, remaining: config.limit - 1 };
  }

  const remaining = Math.max(0, config.limit - row.count);
  if (row.count <= config.limit) {
    return { success: true, limit: config.limit, remaining };
  }

  const windowEndsAt = row.windowStart.getTime() + config.windowMs;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowEndsAt - Date.now()) / 1000)
  );

  return { success: false, limit: config.limit, remaining: 0, retryAfterSeconds };
}

/** Formats a retry-after duration for user-facing error messages. */
export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

// ── Per-endpoint limiter configs ─────────────────────────────
// Centralized here so limits can be tuned in one place. Keys are per-user
// (not per-document/workspace) since the goal is stopping one account from
// hammering the app, not capping legitimate per-resource activity.

export const RATE_LIMITS = {
  /** `createDocument` — apps/web/src/features/documents/actions/room.actions.ts */
  documentCreate: {
    name: "document-create",
    limit: 20,
    windowMs: 10 * 60 * 1000, // 20 per 10 minutes
  },
  /** `updateDocumentAccess` — same file (grants document access + sends email) */
  documentShare: {
    name: "document-share",
    limit: 30,
    windowMs: 60 * 60 * 1000, // 30 per hour
  },
  /** `inviteMember` — apps/web/src/features/workspace/actions/workspace.actions.ts */
  workspaceInvite: {
    name: "workspace-invite",
    limit: 20,
    windowMs: 60 * 60 * 1000, // 20 per hour
  },
  /** `checkCommentRateLimit` — apps/web/src/features/comments/actions/comment.actions.ts */
  commentCreate: {
    name: "comment-create",
    limit: 20,
    windowMs: 60 * 1000, // 20 per minute
  },
} as const satisfies Record<string, RateLimitConfig>;
