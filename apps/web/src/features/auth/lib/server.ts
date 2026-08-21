import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@collabnow/db";
import * as schema from "@collabnow/db/schema";
import { sendMail, verificationEmailHtml } from "@collabnow/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
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
  },
  trustedOrigins: ["http://localhost:3000"],
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
