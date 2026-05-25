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
      <div className="sticky bottom-20 z-20 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
