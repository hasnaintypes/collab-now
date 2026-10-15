import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ── API Key (Personal Access Token) ─────────────────────────────
// P2-6 / PRD FR-16: backs the `@better-auth/api-key` plugin configured in
// `apps/web/src/features/auth/lib/server.ts` — this is *not* a hand-rolled
// token table, it's the exact schema that plugin's own `apiKeySchema()`
// declares (field names/types copied verbatim from
// `node_modules/@better-auth/api-key/dist/index.mjs`), so Better Auth's
// Drizzle adapter can read/write it transparently the same way it already
// does for `user`/`session`/`account`/`verification` above. The table name
// ("apikey", no underscore) and every field name must match the plugin's
// schema exactly — Better Auth resolves both by the property key on this
// module's exports, not by any config mapping.
//
// `referenceId` is the owning user's id — this app only uses the plugin's
// default "user" reference mode (see `enableSessionForAPIKeys` in
// `server.ts`), so it's safe to add the FK/cascade here even though the
// plugin's own field type is a generic string. `key` stores the SHA-256
// hash of the raw token, never the raw value itself — the plugin only
// returns the raw token once, at creation time, same UX as a GitHub PAT.
export const apikey = pgTable("apikey", {
  id: text("id").primaryKey(),
  configId: text("config_id").notNull().default("default"),
  name: text("name"),
  start: text("start"),
  referenceId: text("reference_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  prefix: text("prefix"),
  key: text("key").notNull(),
  refillInterval: integer("refill_interval"),
  refillAmount: integer("refill_amount"),
  lastRefillAt: timestamp("last_refill_at"),
  enabled: boolean("enabled").notNull().default(true),
  rateLimitEnabled: boolean("rate_limit_enabled").notNull().default(true),
  rateLimitTimeWindow: integer("rate_limit_time_window"),
  rateLimitMax: integer("rate_limit_max"),
  requestCount: integer("request_count").notNull().default(0),
  remaining: integer("remaining"),
  lastRequest: timestamp("last_request"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  permissions: text("permissions"),
  metadata: text("metadata"),
});
