"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { ReceptionistActionState } from "@/modules/receptionist/schema";

export function SettingsForm({
  action,
  submitLabel = "Save",
  children,
}: {
  action: (
    prev: ReceptionistActionState,
    formData: FormData,
  ) => Promise<ReceptionistActionState>;
  submitLabel?: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<
    ReceptionistActionState,
    FormData
  >(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Saving…" : submitLabel}
        </Button>
        {state.saved && <span className="text-sm text-emerald-600">Saved</span>}
        {state.error && (
          <span className="text-sm text-destructive" role="alert">
            {state.error}
          </span>
        )}
      </div>
    </form>
  );
}
