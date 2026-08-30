"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { deleteUser } from "@/features/auth/lib/client";

export default function DeleteAccountSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    // Don't leak the typed password across dialog opens.
    if (!value) setPassword("");
  };

  const handleDelete = async () => {
    const { error } = await deleteUser({ password });
    if (error) {
      return {
        success: false,
        error: error.message || "Failed to delete account. Please try again.",
      };
    }
    router.push("/sign-in");
    return { success: true };
  };

  return (
    <div className="flex items-center justify-between px-6 py-5">
      <div>
        <p className="text-sm font-medium">Delete account</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Permanently delete your account and all associated data. This
          action cannot be undone.
        </p>
      </div>
      <ConfirmDialog
        trigger={
          <Button variant="destructive" size="sm">
            Delete
          </Button>
        }
        title="Delete account"
        description="This permanently deletes your account, including any workspace you own and all of its documents. This cannot be undone. Enter your password to confirm."
        confirmLabel="Delete account"
        loadingLabel="Deleting..."
        open={open}
        onOpenChange={handleOpenChange}
        confirmDisabled={password.length === 0}
        onConfirm={handleDelete}
      >
        <div className="space-y-1.5">
          <Label htmlFor="delete-account-password">Password</Label>
          <Input
            id="delete-account-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
