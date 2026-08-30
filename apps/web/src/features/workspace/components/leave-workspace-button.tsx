"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { leaveWorkspace } from "../actions/workspace.actions";

export default function LeaveWorkspaceButton({
  workspaceId,
  workspaceName,
  userId,
}: {
  workspaceId: string;
  workspaceName: string;
  userId: string;
}) {
  const router = useRouter();

  const handleLeave = async () => {
    const result = await leaveWorkspace({ workspaceId, userId });
    if (result.success) {
      // A fresh dashboard visit re-derives the user's workspace from scratch
      // (their own workspace if they have one, otherwise a new one is
      // created) now that this membership is gone.
      router.push("/dashboard");
    }
    return result;
  };

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive" size="sm">
          Leave
        </Button>
      }
      title="Leave workspace"
      description={`Are you sure you want to leave "${workspaceName}"? You'll lose access to all its documents unless someone invites you back.`}
      confirmLabel="Leave workspace"
      loadingLabel="Leaving..."
      onConfirm={handleLeave}
    />
  );
}
