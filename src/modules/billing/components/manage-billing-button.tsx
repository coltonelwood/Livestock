"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  createPortalAction,
  type BillingActionState,
} from "@/modules/billing/actions";

export function ManageBillingButton() {
  const [state, action, pending] = useActionState<BillingActionState, FormData>(
    createPortalAction,
    {},
  );

  return (
    <form action={action}>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Opening…" : "Manage billing"}
      </Button>
      {state.error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
