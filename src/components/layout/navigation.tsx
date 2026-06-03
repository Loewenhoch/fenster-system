"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  SquareCheck,
  ShoppingCart,
  UserCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
// Logout via custom API to avoid CSRF issues with NextAuth v5
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const residentLinks = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Übersicht Ihrer Daten",
  },
  {
    href: "/fenster",
    label: "Meine Öffnungen",
    icon: SquareCheck,
    description: "Sonnenschutz prüfen",
  },
  {
    href: "/bestellung",
    label: "Bestellung",
    icon: ShoppingCart,
    description: "Zusammenfassung",
  },
  {
    href: "/profil",
    label: "Profil",
    icon: UserCircle,
    description: "Persönliche Daten",
  },
];

const adminLinks = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Admin-Übersicht",
  },
  {
    href: "/admin/wohnungen",
    label: "Wohnungen",
    icon: SquareCheck,
    description: "Wohnungen verwalten",
  },
  {
    href: "/admin/bewohner",
    label: "Eigentümer",
    icon: UserCircle,
    description: "Eigentümer verwalten",
  },
  {
    href: "/admin/bestellungen",
    label: "Bestellungen",
    icon: ShoppingCart,
    description: "Alle Bestellungen",
  },
];

interface NavigationProps {
  variant?: "resident" | "admin";
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Navigation({
  variant = "resident",
  mobileOpen,
  onMobileClose,
}: NavigationProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isOpen = mobileOpen !== undefined ? mobileOpen : mobileMenuOpen;
  const setIsOpen = onMobileClose
    ? onMobileClose
    : () => setMobileMenuOpen(false);

  const links = variant === "admin" ? adminLinks : residentLinks;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={setIsOpen}
          aria-hidden="true"
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden w-72 flex-col border-r border-border bg-card lg:flex lg:h-[calc(100vh-5rem)] lg:overflow-y-auto">
        <nav className="flex-1 p-4" aria-label="Hauptnavigation">
          <ul className="space-y-2">
            {links.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-4 text-base font-medium transition-colors",
                      "min-h-[56px]",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-card-foreground hover:bg-muted hover:text-primary"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="size-6 shrink-0" aria-hidden="true" />
                    <div className="flex flex-col">
                      <span>{link.label}</span>
                      <span
                        className={cn(
                          "text-xs",
                          isActive
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                        )}
                      >
                        {link.description}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border p-4">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start gap-3 border-destructive/30 py-4 text-base text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-5" aria-hidden="true" />
            Abmelden
          </Button>
        </div>
      </aside>

      {/* Mobile Slide-out Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform bg-card shadow-xl transition-transform duration-200 ease-in-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!isOpen}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <span className="text-lg font-bold text-primary">Menü</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={setIsOpen}
            aria-label="Menü schließen"
          >
            <X className="size-6" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4" aria-label="Mobile Navigation">
          <ul className="space-y-2">
            {links.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={setIsOpen}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-4 text-base font-medium transition-colors",
                      "min-h-[56px]",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-card-foreground hover:bg-muted hover:text-primary"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="size-6 shrink-0" aria-hidden="true" />
                    <div className="flex flex-col">
                      <span>{link.label}</span>
                      <span
                        className={cn(
                          "text-xs",
                          isActive
                            ? "text-primary-foreground/80"
                            : "text-muted-foreground"
                        )}
                      >
                        {link.description}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border p-4">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start gap-3 border-destructive/30 py-4 text-base text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-5" aria-hidden="true" />
            Abmelden
          </Button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.05)] lg:hidden"
        aria-label="Mobile Bottom Navigation"
      >
        <ul className="flex items-center justify-around px-2 py-2">
          {links.slice(0, 4).map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <li key={link.href} className="flex-1">
                <Link
                  href={link.href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className={cn(
                      "size-6",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
