"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { loadPaddle } from "../lib/load-paddle";
import { PADDLE_PRICE_IDS } from "../lib/paddle-config";
import type { PaidPlanId } from "../types";

type UpgradeButtonProps = {
  plan: PaidPlanId;
  workspaceId: string;
  customerEmail: string;
  label: string;
};

/**
 * Opens Paddle's hosted checkout overlay — no card data ever touches
 * CollabNow's own servers or client code, satisfying P3-2's acceptance
 * criteria by construction rather than by any validation this component
 * does itself.
 *
 * `customData.workspaceId` rides along on the resulting Paddle subscription
 * object so P3-3's webhook handler knows which workspace to attribute the
 * upgrade to — Paddle has no concept of CollabNow's own workspace ids. That
 * handler still needs to treat this value as attacker-influenced input (a
 * technical user could tamper with it via devtools) and re-verify the
 * paying user's membership before writing anything, the same trust-boundary
 * rule as every other server action in this codebase — this component only
 * gates who *sees* the button, not a security boundary by itself.
 */
export default function UpgradeButton({
  plan,
  workspaceId,
  customerEmail,
  label,
}: UpgradeButtonProps) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceId = PADDLE_PRICE_IDS[plan];

  async function handleClick() {
    if (!priceId) {
      setError("Checkout isn't configured yet for this plan.");
      return;
    }

    setOpening(true);
    setError(null);
    try {
      const paddle = await loadPaddle();
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email: customerEmail },
        customData: { workspaceId },
      });
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
