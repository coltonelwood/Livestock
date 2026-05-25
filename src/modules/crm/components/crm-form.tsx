"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { CrmActionState } from "@/modules/crm/schema";

export function CrmForm({
  action,
  submitLabel,
  children,
}: {
  action: (prev: CrmActionState, formData: FormData) => Promise<CrmActionState>;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<CrmActionState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      {children}
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {/* Sticky save on mobile (sits above the bottom nav); inline on desktop. */}
      <div className="sticky bottom-20 z-20 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
