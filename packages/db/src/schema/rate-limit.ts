import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

// ── Rate Limit Bucket ────────────────────────────────────────

// Fixed-window counter backing `apps/web/src/lib/rate-limit.ts`. One row per
// `${limiterName}:${identifier}` key (e.g. `document-create:<userId>`);
// `count`/`windowStart` are read and reset together via a single atomic
// `INSERT ... ON CONFLICT DO UPDATE` so concurrent requests for the same key
// can't race past the configured limit.
export const rateLimitBucket = pgTable("rate_limit_bucket", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start").notNull().defaultNow(),
});
