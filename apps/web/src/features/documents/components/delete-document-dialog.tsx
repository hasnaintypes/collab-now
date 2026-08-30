"use client";

import { Trash2 } from "lucide-react";
import { deleteDocument } from "../actions/room.actions";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import type { DeleteModalProps } from "../types";

export default function DeleteDocumentDialog({ roomId }: DeleteModalProps) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon-sm">
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      }
      title="Delete document"
      description="Are you sure you want to delete this document? This action cannot be undone."
      confirmLabel="Delete"
      loadingLabel="Deleting..."
      // On success, `deleteDocument` redirects to `/dashboard` internally and
      // this component unmounts before `ConfirmDialog` ever closes itself —
      // that's fine, it just never gets the chance to run.
      onConfirm={() => deleteDocument(roomId)}
    />
  );
}
