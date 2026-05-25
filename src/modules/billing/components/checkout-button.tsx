"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  createCheckoutAction,
  type BillingActionState,
} from "@/modules/billing/actions";
import type { PlanId } from "@/modules/billing/plans";

export function CheckoutButton({
  plan,
  label,
  variant = "default",
  disabled,
}: {
  plan: PlanId;
  label: string;
  variant?: "default" | "outline" | "secondary";
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState<BillingActionState, FormData>(
    createCheckoutAction,
    {},
  );

  return (
    <form action={action} className="w-full">
      <input type="hidden" name="plan" value={plan} />
      <Button
        type="submit"
        variant={variant}
        className="w-full"
        disabled={pending || disabled}
      >
        {pending ? "Redirecting…" : label}
      </Button>
      {state.error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
