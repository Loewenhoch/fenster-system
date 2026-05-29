"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Ein Fehler ist aufgetreten",
  message = "Es tut uns leid, aber etwas ist schiefgelaufen. Bitte versuchen Sie es später erneut.",
  onRetry,
  className,
}: ErrorProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center",
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-destructive">{title}</h2>
        <p className="max-w-md text-base text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="lg"
          className="mt-2 gap-2"
        >
          <RefreshCcw className="size-5" aria-hidden="true" />
          Erneut versuchen
        </Button>
      )}
    </div>
  );
}
