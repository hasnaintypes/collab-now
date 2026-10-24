"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { loadPaddle } from "../lib/load-paddle";
import { createCheckoutTransaction } from "../actions/billing.actions";
import type { PaidPlanId } from "../types";

type UpgradeButtonProps = {
  plan: PaidPlanId;
  workspaceId: string;
  label: string;
};

/**
 * Opens Paddle's hosted checkout overlay — no card data ever touches
 * CollabNow's own servers or client code, satisfying P3-2's acceptance
 * criteria by construction rather than by any validation this component
 * does itself.
 *
 * The transaction itself is created server-side first
 * (`createCheckoutTransaction`, which re-verifies the caller's workspace
 * role) rather than this component calling `Paddle.Checkout.open()` with
 * raw `items`/`customData` — that's the real authorization boundary, not
 * `canManageBilling` hiding this button in `billing-section.tsx`, which is
 * UI-only and wouldn't stop a technical user from invoking this flow
 * directly.
 */
export default function UpgradeButton({
  plan,
  workspaceId,
  label,
}: UpgradeButtonProps) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setOpening(true);
    setError(null);
    try {
      const result = await createCheckoutTransaction({ workspaceId, plan });
      if (!result.success) {
        setError(result.error);
        return;
      }

      const paddle = await loadPaddle();
      paddle.Checkout.open({ transactionId: result.data.transactionId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open checkout.");
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={handleClick} disabled={opening}>
        {opening ? "Opening checkout…" : label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
