import type { ButtonHTMLAttributes } from "react";

type Variant = "default" | "outline" | "ghost" | "destructive";

/**
 * Hand-written subset of apps/web/src/components/ui/button.tsx's variants
 * (default/outline/ghost/destructive only — the extension's popup/options
 * UI never needs secondary/link/icon sizing). No cva/radix-ui dependency:
 * this is a small, fixed set of variants for a two-page popup, not a
 * shared component library, so a lookup object is simpler than pulling in
 * the class-variance-authority + Slot machinery the web app's version
 * uses for `asChild` polymorphism this extension never needs.
 */
const VARIANT_CLASSES: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/80",
  outline:
    "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  destructive:
    "bg-destructive/10 text-destructive hover:bg-destructive/20",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({
  variant = "default",
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className ?? ""}`}
      {...props}
    />
  );
}
