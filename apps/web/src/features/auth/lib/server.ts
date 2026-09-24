import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { apiKey } from "@better-auth/api-key";
import { eq } from "drizzle-orm";
import { db, document } from "@collabnow/db";
import * as schema from "@collabnow/db/schema";
import { liveblocks } from "@/lib/liveblocks";
import {
  sendMail,
  verificationEmailHtml,
  passwordResetEmailHtml,
  welcomeEmailHtml,
} from "@collabnow/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      void sendMail({
        to: user.email,
        subject: "Reset your password — Collab Now",
        html: passwordResetEmailHtml({ name: user.name, resetUrl: url }),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendMail({
        to: user.email,
        subject: "Verify your email — Collab Now",
        html: verificationEmailHtml({ name: user.name, verifyUrl: url }),
      });
    },
    afterEmailVerification: async (user) => {
      // Better Auth only calls this hook on the transition to verified (it no-ops on
      // replayed verification links), so this fires exactly once per user. It's awaited
      // by the verify-email endpoint, so a send failure must not throw and fail that flow.
      try {
        await sendMail({
          to: user.email,
          subject: "Welcome to Collab Now",
          html: welcomeEmailHtml({
            name: user.name,
            dashboardUrl: `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/dashboard`,
          }),
        });
      } catch (error) {
        console.error("Failed to send welcome email:", error);
      }
    },
  },
  user: {
    deleteUser: {
      enabled: true,
      // No `sendDeleteAccountVerification` — deletion requires the user's
      // current password (checked by Better Auth itself) and takes effect
      // immediately, rather than a follow-up "click this email link" step.
      beforeDelete: async (deletedUser) => {
        // Documents this user created cascade-delete from Postgres via the
        // schema's `onDelete: cascade` on `document.creatorId`. Destroy
        // their Liveblocks rooms first so the two sources of truth (see
        // CLAUDE.md's dual-source-of-truth note) don't drift apart — a room
        // would otherwise be orphaned in Liveblocks with no matching
        // Postgres row once the cascade runs.
        const owned = await db
          .select({ roomId: document.roomId })
          .from(document)
          .where(eq(document.creatorId, deletedUser.id));

        await Promise.allSettled(
          owned.map((doc) => liveblocks.deleteRoom(doc.roomId))
        );
      },
    },
  },
  trustedOrigins: ["http://localhost:3000"],
  plugins: [
    // P2-6 / PRD FR-16: the browser extension authenticates via a personal
    // access token instead of shared session cookies (it runs in a
    // `chrome-extension://` origin, which never carries this app's session
    // cookie). Backed by the `apikey` table in `@collabnow/db/schema/auth`
    // — that table's own comment explains why its shape must match this
    // plugin's schema exactly.
    //
    // Deliberately *not* using `enableSessionForAPIKeys` (which would make
    // every session-authenticated endpoint in this app reachable via a
    // Bearer/`x-api-key` header) — the plugin's own type docs flag that
    // option as "not recommended for production use". Instead,
    // `api/extension/me/route.ts` calls `auth.api.verifyApiKey` directly
    // and resolves the user itself, so a PAT only ever unlocks the small,
    // explicit set of extension-facing routes this app defines — not the
    // full session surface (password change, account deletion, etc.).
    apiKey({
      requireName: true, // every token needs a name so a future revoke UI (P2-8) can tell them apart
      enableMetadata: false,
      rateLimit: {
        enabled: true,
        timeWindow: 60 * 60 * 1000, // 1 hour
        maxRequests: 100, // generous — this key is used for polling/status checks (P2-7), not just one-shot submits
      },
    }),
    // Must stay last: intercepts responses from the plugins above to set
    // cookies via Next's cookie APIs (Better Auth's own requirement).
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
