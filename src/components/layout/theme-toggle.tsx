"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="relative inline-flex h-11 w-[5.5rem] items-center rounded-full border border-primary-foreground/25 bg-primary-foreground/12 p-1 text-primary-foreground shadow-inner transition-colors hover:bg-primary-foreground/18 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-foreground/45"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Hellmodus einschalten" : "Dunkelmodus einschalten"}
      aria-pressed={isDark}
    >
      <span className="flex w-full items-center justify-between px-1.5">
        <Sun
          className={cn(
            "size-4 transition-opacity",
            isDark ? "opacity-55" : "opacity-100"
          )}
          aria-hidden="true"
        />
        <Moon
          className={cn(
            "size-4 transition-opacity",
            isDark ? "opacity-100" : "opacity-55"
          )}
          aria-hidden="true"
        />
      </span>
      <span
        className={cn(
          "absolute left-1 top-1 flex size-9 items-center justify-center rounded-full bg-primary-foreground text-primary shadow-sm transition-transform",
          isDark && "translate-x-[2.75rem]"
        )}
        aria-hidden="true"
      >
        {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </span>
    </button>
  );
}
