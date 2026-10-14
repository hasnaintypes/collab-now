import { and, eq } from "drizzle-orm";
import { db, workspaceMember } from "@collabnow/db";

import { ActionError } from "@/lib/action-result";

/**
 * Throws `ActionError` unless `userId` is a member of `workspaceId`. Shared
 * by every feature that re-derives a workspace id server-side (never from
 * client input) and needs to enforce the resulting isolation boundary —
 * `features/ingestion/actions/ingestion.actions.ts` and
 * `features/chat/actions/chat.actions.ts` both call this instead of each
 * keeping their own copy, since a membership-rule change (roles,
 * soft-deleted members, etc.) should only need updating in one place.
 */
export async function requireWorkspaceMembership(
  workspaceId: string,
  userId: string
): Promise<void> {
  const [membership] = await db
    .select({ id: workspaceMember.id })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, userId)
      )
    )
    .limit(1);

  if (!membership) {
    throw new ActionError("You don't have access to this workspace.");
  }
}
