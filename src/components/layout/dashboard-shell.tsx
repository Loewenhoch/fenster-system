"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";

interface DashboardShellProps {
  children: React.ReactNode;
  variant?: "resident" | "admin";
}

export function DashboardShell({ children, variant = "resident" }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        showNav
        onMenuToggle={() => setMobileNavOpen((prev) => !prev)}
        menuOpen={mobileNavOpen}
      />
      <div className="flex flex-1">
        <Navigation
          variant={variant}
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
        />
        <main className="flex-1 pb-24 lg:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            {children}
          </div>
        </main>
      </div>
      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
