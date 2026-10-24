import { Badge } from "@/components/ui/badge";
import UpgradeButton from "./upgrade-button";
import { PLAN_LABELS } from "../lib/paddle-config";
import type { WorkspaceSubscription } from "../types";

type BillingSectionProps = {
  workspaceId: string;
  subscription: WorkspaceSubscription;
  /** Only workspace owners/admins can start a checkout — same role gate as
   * the member-management actions in `workspace.actions.ts`. */
  canManageBilling: boolean;
  customerEmail: string;
};

export default function BillingSection({
  workspaceId,
  subscription,
  canManageBilling,
  customerEmail,
}: BillingSectionProps) {
  const { plan, status } = subscription;

  return (
    <div className="rounded-sm bg-muted/40">
      <div className="divide-y divide-border/50 px-6">
        <div className="flex items-center justify-between gap-8 py-5">
          <div>
            <p className="text-sm font-medium">Current plan</p>
            <p className="mt-0.5 text-xs capitalize text-muted-foreground">
              {status}
            </p>
          </div>
          <Badge variant={plan === "free" ? "outline" : "default"}>
            {PLAN_LABELS[plan]}
          </Badge>
        </div>

        {!canManageBilling && (
          <div className="py-5">
            <p className="text-xs text-muted-foreground">
              Only workspace owners and admins can manage billing.
            </p>
          </div>
        )}

        {canManageBilling && plan === "free" && (
          <div className="flex items-center justify-between gap-8 py-5">
            <div>
              <p className="text-sm font-medium">Upgrade to Pro</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Higher note-generation cap, all note styles, priority
                processing, and chat.
              </p>
            </div>
            <UpgradeButton
              plan="pro"
              workspaceId={workspaceId}
              customerEmail={customerEmail}
              label="Upgrade to Pro"
            />
          </div>
        )}

        {canManageBilling && plan !== "team" && (
          <div className="flex items-center justify-between gap-8 py-5">
            <div>
              <p className="text-sm font-medium">Upgrade to Team</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Multiple seats with a shared note-generation cap.
              </p>
            </div>
            <UpgradeButton
              plan="team"
              workspaceId={workspaceId}
              customerEmail={customerEmail}
              label="Upgrade to Team"
            />
          </div>
        )}
      </div>
    </div>
  );
}
