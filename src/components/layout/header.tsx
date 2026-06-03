"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { LogOut, User, Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderProps {
  showNav?: boolean;
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}

export function Header({ showNav = false, onMenuToggle, menuOpen }: HeaderProps) {
  const { data: session } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout error:", e);
    }
    // Session-Storage und Local-Storage leeren
    if (typeof window !== "undefined") {
      sessionStorage.clear();
      localStorage.clear();
    }
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-primary text-primary-foreground shadow-sm">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo / Titel */}
        <div className="flex items-center gap-3">
          {showNav && onMenuToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="mr-1 text-primary-foreground hover:bg-primary-foreground/10 lg:hidden"
              onClick={onMenuToggle}
              aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="size-7" /> : <Menu className="size-7" />}
            </Button>
          )}
          <Link href="/" className="flex flex-col gap-0.5">
            <span className="text-xl font-bold tracking-tight sm:text-2xl">
              Sonnenschutz
            </span>
            <span className="text-sm font-medium opacity-90 sm:text-base">
              Starhembergstraße 64/66
            </span>
          </Link>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          {session?.user ? (
            <div className="relative">
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/15">
                  {session.user.role === "ADMIN" ? (
                    <Shield className="size-5" aria-hidden="true" />
                  ) : (
                    <User className="size-5" aria-hidden="true" />
                  )}
                </div>
                <span className="hidden max-w-[12rem] truncate text-base font-medium sm:inline">
                  {session.user.name || session.user.email}
                </span>
              </Button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-border bg-popover p-2 shadow-lg"
                    role="menu"
                  >
                    <div className="border-b border-border px-3 py-2">
                      <p className="text-base font-semibold text-popover-foreground">
                        {session.user.name || "Benutzer"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-3 text-base text-destructive hover:bg-destructive/10"
                      role="menuitem"
                    >
                      <LogOut className="size-5" aria-hidden="true" />
                      Abmelden
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/login">
              <Button
                variant="secondary"
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Anmelden
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
