"use client";

import ErrorState from "@/components/shared/error-state";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      title="Couldn't load your dashboard"
      description="Something went wrong while loading your documents and workspace. Try again in a moment."
      homeHref="/dashboard"
      homeLabel="Reload dashboard"
    />
  );
}
