"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

type BaseState = { error?: string; saved?: boolean };

/**
 * Generic server-action form: wires useActionState, renders children (the
 * inputs), surfaces an error, and a submit button. Reusable across modules.
 */
export function ActionForm<S extends BaseState>({
  action,
  submitLabel,
  pendingLabel = "Saving…",
  children,
}: {
  action: (prev: Awaited<S>, formData: FormData) => Promise<S>;
  submitLabel: string;
  pendingLabel?: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<S, FormData>(
    action,
    {} as Awaited<S>,
  );

  return (
    <form action={formAction} className="space-y-4">
      {children}
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state.saved && <p className="text-sm text-emerald-600">Saved.</p>}
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
