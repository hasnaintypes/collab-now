import { unstable_rethrow } from "next/navigation";

/**
 * Standard result shape for server actions across the `documents`,
 * `workspace`, and `activity` features (see docs/ROADMAP.md P0-7). Every
 * exported action in those features' `*.actions.ts` files resolves to this
 * instead of throwing or inventing its own ad hoc shape — callers must check
 * `result.success` before touching `.data`.
 *
 * `retryAfterSeconds` is an optional cross-cutting extra used by rate-limited
 * actions (see `@/lib/rate-limit`); actions that don't rate limit simply never
 * set it.
 *
 * Deliberately excluded: `getUsers`/`getDocumentUsers`
 * (`features/documents/actions/user.actions.ts`) feed directly into
 * Liveblocks' `resolveUsers`/`resolveMentionSuggestions` callbacks, which
 * require a plain array/undefined return — wrapping them would break that
 * integration, so they keep their own documented fallback behavior instead.
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; retryAfterSeconds?: number };

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function actionError(
  error: string,
  retryAfterSeconds?: number
): ActionResult<never> {
  return { success: false, error, retryAfterSeconds };
}

/**
 * Throw this (instead of a plain `Error`) inside a `safeAction`-wrapped
 * function for expected, user-facing failures — validation failures or
 * business-rule violations like "Document not found" or "You cannot remove
 * yourself from the document". `safeAction` surfaces `ActionError.message`
 * to the client as-is.
 *
 * Any *other* thrown error is treated as unexpected: it's logged server-side
 * and replaced with a generic message before reaching the client, so internal
 * details (DB errors, Liveblocks API errors, stack traces) never leak to the UI.
 */
export class ActionError extends Error {}

/**
 * Wraps a server action's body so it always resolves to `ActionResult<T>`.
 * Next.js control-flow errors (`redirect`, `notFound`, etc. from
 * `next/navigation`) are always rethrown untouched via `unstable_rethrow`
 * first — they're navigation, not failures, and must keep propagating to the
 * framework rather than being caught and turned into an error result.
 */
export async function safeAction<T>(
  fn: () => Promise<T>,
  fallbackMessage = "Something went wrong. Please try again."
): Promise<ActionResult<T>> {
  try {
    return actionSuccess(await fn());
  } catch (error) {
    unstable_rethrow(error);

    if (error instanceof ActionError) {
      return actionError(error.message);
    }

    console.error(error);
    return actionError(fallbackMessage);
  }
}
