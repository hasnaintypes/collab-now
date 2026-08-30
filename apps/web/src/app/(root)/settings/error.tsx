"use client";

import ErrorState from "@/components/shared/error-state";

export default function SettingsError({
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
      title="Couldn't load settings"
      description="Something went wrong while loading your account and workspace settings. Try again in a moment."
      homeHref="/dashboard"
      homeLabel="Back to dashboard"
    />
  );
}
