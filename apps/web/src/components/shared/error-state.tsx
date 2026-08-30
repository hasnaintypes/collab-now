"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shared UI for route-level `error.tsx` boundaries. Next.js requires those
 * files to be Client Components, so the actual rendering lives here and each
 * `error.tsx` just wires up the route-specific copy/links.
 */
export default function ErrorState({
  error,
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred. You can try again, or head back if the problem persists.",
  homeHref = "/dashboard",
  homeLabel = "Back to dashboard",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  homeHref?: string;
  homeLabel?: string;
}) {
  useEffect(() => {
    // Server-side details never reach the client bundle here — this just
    // surfaces the already-sanitized message for local debugging.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-8 py-24 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-sm bg-destructive/10">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <h2 className="mb-2 text-xl font-bold tracking-tight">{title}</h2>
      <p className="mb-8 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <Button onClick={() => reset()}>
          <RotateCw className="size-4" />
          Try again
        </Button>
        <Link
          href={homeHref}
          className="text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}
