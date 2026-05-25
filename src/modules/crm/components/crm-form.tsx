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
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
