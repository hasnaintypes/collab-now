"use client";

import { useState } from "react";
import { Button, type buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { VariantProps } from "class-variance-authority";

type ConfirmOutcome = { success: boolean; error?: string } | null | undefined | void;

/**
 * Shared confirmation dialog for destructive (or otherwise hard-to-undo)
 * actions across the app — e.g. delete document, remove collaborator, revoke
 * invite, remove workspace member, leave workspace. Every one of those
 * should render one of these instead of hand-rolling its own `Dialog` +
 * open/loading/error state (see docs/ROADMAP.md P0-9).
 *
 * `onConfirm` may return an `ActionResult`-shaped value (`{success, error?}`)
 * — if `success` is `false`, the dialog stays open and shows `error` inline;
 * otherwise (including a plain `void` return) it closes on completion.
 */
export default function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  loadingLabel,
  cancelLabel = "Cancel",
  variant = "destructive",
  onConfirm,
  open: controlledOpen,
  onOpenChange,
  children,
  confirmDisabled = false,
}: {
  /** Element that opens the dialog when clicked. Omit for a fully controlled dialog. */
  trigger?: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  /** Shown on the confirm button while `onConfirm` is in flight. Defaults to `"${confirmLabel}..."`. */
  loadingLabel?: string;
  cancelLabel?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  onConfirm: () => Promise<ConfirmOutcome> | ConfirmOutcome;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Extra content rendered between the description and the error/footer — e.g. a "type DELETE to confirm" input. */
  children?: React.ReactNode;
  confirmDisabled?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = controlledOpen ?? internalOpen;

  const setOpen = (value: boolean) => {
    if (!value) setError(null);
    if (onOpenChange) onOpenChange(value);
    else setInternalOpen(value);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    const result = await onConfirm();
    setLoading(false);
    if (result && result.success === false) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline" disabled={loading}>
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={loading || confirmDisabled}
          >
            {loading ? loadingLabel ?? `${confirmLabel}...` : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
