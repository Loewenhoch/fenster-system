"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <ErrorState
        title="Seite konnte nicht geladen werden"
        message={
          error.message ||
          "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut."
        }
        onRetry={reset}
      />
    </div>
  );
}
