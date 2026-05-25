"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/modules/auth/actions";

export function UserMenu({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-muted-foreground sm:inline">
        {name}
      </span>
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" size="sm" title="Log out">
          <LogOut className="size-4" />
          <span className="sr-only">Log out</span>
        </Button>
      </form>
    </div>
  );
}
