"use server";

import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { auth } from "@/features/auth/lib";
import { checkRateLimit, formatRetryAfter, RATE_LIMITS } from "@/lib/rate-limit";
import {
  type ActionResult,
  ActionError,
  actionError,
  safeAction,
} from "@/lib/action-result";

/**
 * Settings page section for generating/revoking the personal access tokens
 * the browser extension authenticates with (P2-8 / PRD FR-16). Thin
 * wrappers around Better Auth's `apiKey()` plugin (`auth.api.createApiKey`/
 * `listApiKeys`/`deleteApiKey`, configured in `features/auth/lib/server.ts`)
 * rather than a hand-rolled token table — that plugin already stores
 * tokens hashed (`packages/db/src/schema/auth.ts`'s `apikey` table) and
 * enforces per-user ownership on every operation itself (`deleteApiKey`
 * throws `KEY_NOT_FOUND` for a key that exists but belongs to someone
 * else, same as "doesn't exist" — never leaking which).
 *
 * Deliberately *not* exposing Better Auth's client-side `apiKeyClient()`
 * plugin to the browser (see the `apiKey()` config comment in `server.ts`
 * for why PATs stay off the full session/client surface) — these actions
 * are the only way the Settings UI touches tokens, same `"use server"` +
 * `ActionResult` convention as every other feature.
 */

export type PersonalAccessToken = {
  id: string;
  name: string | null;
  start: string | null;
  enabled: boolean;
  createdAt: string;
  lastRequest: string | null;
  expiresAt: string | null;
};

export const listPersonalAccessTokens = async (): Promise<
  ActionResult<PersonalAccessToken[]>
> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return actionError("You must be signed in to view your personal access tokens.");
  }

  return safeAction(async () => {
    const { apiKeys } = await auth.api.listApiKeys({ headers: await headers() });

    // Newest first — a user generating tokens over time wants to see their
    // most recent one (e.g. one they just created for a new machine) without
    // scrolling past older ones.
    return apiKeys
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((key) => ({
        id: key.id,
        name: key.name,
        start: key.start,
        enabled: key.enabled,
        createdAt: key.createdAt.toISOString(),
        lastRequest: key.lastRequest ? key.lastRequest.toISOString() : null,
        expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
      }));
  }, "Failed to load your personal access tokens.");
};

const MAX_TOKEN_NAME_LENGTH = 100;

/**
 * Returns the raw token in `data.token` — the one and only time it's ever
 * available in plaintext (Better Auth hashes it before persisting, same as
 * every subsequent `listPersonalAccessTokens` call only ever returning
 * `start`/metadata, never the key itself). The Settings UI must show this
 * once and warn the user to copy it now.
 */
export const createPersonalAccessToken = async ({
  name,
}: {
  name: string;
}): Promise<ActionResult<{ id: string; token: string }>> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return actionError("You must be signed in to create a personal access token.");
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return actionError("Give this token a name so you can tell it apart later.");
  }
  if (trimmedName.length > MAX_TOKEN_NAME_LENGTH) {
    return actionError(
      `Token names can't be longer than ${MAX_TOKEN_NAME_LENGTH} characters.`
    );
  }

  const rateLimit = await checkRateLimit(RATE_LIMITS.tokenCreate, session.user.id);
  if (!rateLimit.success) {
    return actionError(
      `You're creating tokens too quickly. Try again in ${formatRetryAfter(rateLimit.retryAfterSeconds!)}.`,
      rateLimit.retryAfterSeconds
    );
  }

  return safeAction(async () => {
    const created = await auth.api.createApiKey({
      body: { name: trimmedName },
      headers: await headers(),
    });

    return { id: created.id, token: created.key };
  }, "Failed to create a personal access token. Please try again.");
};

export const revokePersonalAccessToken = async ({
  tokenId,
}: {
  tokenId: string;
}): Promise<ActionResult<null>> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return actionError("You must be signed in to revoke a personal access token.");
  }

  return safeAction(async () => {
    try {
      await auth.api.deleteApiKey({
        body: { keyId: tokenId },
        headers: await headers(),
      });
    } catch (error) {
      // Covers both "doesn't exist" and "belongs to someone else" — the
      // plugin's own `deleteApiKey` enforces ownership by throwing this
      // same NOT_FOUND for both, so this never leaks which.
      if (error instanceof APIError && error.status === "NOT_FOUND") {
        throw new ActionError("That token could not be found.");
      }
      throw error;
    }

    return null;
  }, "Failed to revoke this token. Please try again.");
};
