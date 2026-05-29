"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fullScreen?: boolean;
}

const sizeMap = {
  sm: "size-6",
  md: "size-10",
  lg: "size-16",
};

const textSizeMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

export function Loading({
  text = "Wird geladen...",
  size = "md",
  className,
  fullScreen = false,
}: LoadingProps) {
  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2
        className={cn("animate-spin text-primary", sizeMap[size])}
        aria-hidden="true"
      />
      {text && (
        <span className={cn("text-muted-foreground font-medium", textSizeMap[size])}>
          {text}
        </span>
      )}
      <span className="sr-only">{text}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
