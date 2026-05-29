"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <Button
      variant="destructive"
      size="lg"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="gap-2"
    >
      <LogOut className="size-5" />
      Abmelden
    </Button>
  );
}
