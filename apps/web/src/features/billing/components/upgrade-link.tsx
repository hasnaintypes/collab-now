import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * P3-5 / PRD §7 Flow D: rendered wherever an `ActionResult`'s
 * `upgradeRequired` flag comes back true (`new-from-url-dialog.tsx`'s
 * usage-cap rejection, `chat-panel.tsx`'s plan-gated chat rejection) —
 * factored out so the copy/href/styling only needs to change in one place
 * rather than drifting between callers that each had their own copy.
 */
export default function UpgradeLink({
  className,
  block = false,
}: {
  className?: string;
  block?: boolean;
}) {
  return (
    <Link
      href="/settings"
      className={cn(
        "font-medium text-primary underline-offset-4 hover:underline",
        block ? "block text-sm" : "text-xs",
        className
      )}
    >
      Upgrade your plan →
    </Link>
  );
}
