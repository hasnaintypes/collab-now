import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
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
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
