"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  startCheckoutAction,
  type CheckoutState,
} from "@/modules/commerce/actions";

export function CheckoutForm({
  items,
  label = "Checkout",
}: {
  items: { product_id: string; quantity: number }[];
  label?: string;
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(
    startCheckoutAction,
    {},
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <Button type="submit" className="w-full" disabled={pending || items.length === 0}>
        {pending ? "Starting checkout…" : label}
      </Button>
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
