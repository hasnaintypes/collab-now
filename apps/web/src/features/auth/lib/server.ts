import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@collabnow/db";
import * as schema from "@collabnow/db/schema";
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
  trustedOrigins: ["http://localhost:3000"],
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
