"use client";

import ErrorState from "@/components/shared/error-state";

export default function DocumentError({
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
      title="Couldn't load this document"
      description="It may have been deleted, or you may no longer have access. Try again, or head back to your dashboard."
      homeHref="/dashboard"
      homeLabel="Back to dashboard"
    />
  );
}
