"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { dateConverter } from "@/lib/utils";
import { removeMember } from "../actions/workspace.actions";
import type { WorkspaceMember, WorkspaceRole } from "../types";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Owner/admin can remove a plain member; only the owner can remove an admin.
// Nobody can remove the owner or themselves (self-removal is "leave
// workspace" instead, a separate flow).
function canRemove(
  currentUserId: string,
  currentUserRole: WorkspaceRole,
  member: WorkspaceMember
) {
  if (currentUserRole !== "owner" && currentUserRole !== "admin") return false;
  if (member.id === currentUserId) return false;
  if (member.role === "owner") return false;
  if (member.role === "admin" && currentUserRole !== "owner") return false;
  return true;
}

export default function WorkspaceMembersList({
  members,
  workspaceId,
  currentUserId,
  currentUserRole,
}: {
  members: WorkspaceMember[];
  workspaceId: string;
  currentUserId: string;
  currentUserRole: WorkspaceRole;
}) {
  const [items, setItems] = useState(members);

  const handleRemove = async (memberUserId: string) => {
    const result = await removeMember({
      workspaceId,
      memberUserId,
      removedById: currentUserId,
    });
    if (result.success) {
      setItems((prev) => prev.filter((m) => m.id !== memberUserId));
    }
    return result;
  };

  return (
    <ul className="divide-y divide-border/50 px-6">
      {items.map((member) => (
        <li
          key={member.id}
          className="flex items-center justify-between gap-4 py-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            {member.image ? (
              <Image
                src={member.image}
                alt={member.name}
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {getInitials(member.name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{member.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {member.email}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Joined {dateConverter(member.joinedAt)}
            </span>
            <span className="rounded-sm bg-muted px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {member.role}
            </span>
            {canRemove(currentUserId, currentUserRole, member) && (
              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-destructive hover:text-destructive"
                  >
                    Remove
                  </Button>
                }
                title="Remove member"
                description={`Remove ${member.name} from this workspace? They'll lose access to the workspace and its documents immediately.`}
                confirmLabel="Remove"
                loadingLabel="Removing..."
                onConfirm={() => handleRemove(member.id)}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
