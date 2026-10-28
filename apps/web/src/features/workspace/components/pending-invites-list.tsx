"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { dateConverter } from "@/lib/utils";
import { revokeInvite } from "../actions/workspace.actions";
import type { PendingInvite, WorkspaceRole } from "../types";

/**
 * Surfaces pending invites directly on the Settings page, next to the
 * member list — previously the only place to see or revoke a pending
 * invite was by reopening the "Invite Member" dialog, which made revoking
 * one easy to miss entirely. Same revoke action as that dialog
 * (`revokeInvite`), just a second, more visible place to reach it from.
 */
export default function PendingInvitesList({
  invites,
  workspaceId,
  currentUserId,
  currentUserRole,
}: {
  invites: PendingInvite[];
  workspaceId: string;
  currentUserId: string;
  currentUserRole: WorkspaceRole;
}) {
  const [items, setItems] = useState(invites);
  const canRevoke =
    currentUserRole === "owner" || currentUserRole === "admin";

  const handleRevoke = async (inviteId: string) => {
    const result = await revokeInvite({
      inviteId,
      workspaceId,
      revokedById: currentUserId,
    });
    if (result.success) {
      setItems((prev) => prev.filter((i) => i.id !== inviteId));
    }
    return result;
  };

  if (items.length === 0) return null;

  return (
    <ul className="divide-y divide-border/50 px-6">
      {items.map((invite) => (
        <li
          key={invite.id}
          className="flex items-center justify-between gap-4 py-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Clock className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{invite.email}</p>
              <p className="truncate text-xs text-muted-foreground">
                Invited {dateConverter(invite.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="rounded-sm bg-muted px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {invite.role}
            </span>
            {canRevoke && (
              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-destructive hover:text-destructive"
                  >
                    Cancel invite
                  </Button>
                }
                title="Cancel invite"
                description={`Cancel the pending invite to ${invite.email}? They'll no longer be able to join using that invite link.`}
                confirmLabel="Cancel invite"
                loadingLabel="Cancelling..."
                onConfirm={() => handleRevoke(invite.id)}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
