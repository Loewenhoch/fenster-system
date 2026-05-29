"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error";

export default function RootError({
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
        title="Etwas ist schiefgelaufen"
        message={
          error.message ||
          "Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu."
        }
        onRetry={reset}
      />
    </div>
  );
}
