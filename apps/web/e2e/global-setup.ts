import { db, user, account } from "@collabnow/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { nanoid } from "nanoid";

// Seeds one verified, password-login-ready user directly in Postgres so the
// smoke test can sign in immediately, without needing to click a real
// verification-email link (Better Auth's `emailAndPassword.requireEmailVerification`
// otherwise blocks sign-in until that happens — see CLAUDE.md's auth notes).
// `hashPassword` from `better-auth/crypto` is the same hashing Better Auth's
// own sign-up route uses, so this seeded account authenticates exactly like
// a real one would once verified — this isn't a test-only auth bypass, it's
// pre-completing the one manual step (clicking the email link) that a human
// would otherwise do once per environment.
//
// Idempotent: safe to run every test invocation against a persistent dev/CI
// database — it no-ops once the user already exists.
export const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL || "e2e@collabnow.test";
export const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD || "E2eTestPassword123!";
const E2E_USER_NAME = "E2E Test User";

export default async function globalSetup() {
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, E2E_USER_EMAIL))
    .limit(1);

  if (existing) return;

  const userId = nanoid();
  const now = new Date();

  await db.insert(user).values({
    id: userId,
    name: E2E_USER_NAME,
    email: E2E_USER_EMAIL,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(account).values({
    id: nanoid(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: await hashPassword(E2E_USER_PASSWORD),
    createdAt: now,
    updatedAt: now,
  });
}
