"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { ListingActionState } from "@/modules/listings/schema";

export function ListingForm({
  action,
  children,
}: {
  action: (
    prev: ListingActionState,
    formData: FormData,
  ) => Promise<ListingActionState>;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<
    ListingActionState,
    FormData
  >(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {children}
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        {/* The clicked button's name/value is submitted, choosing the status. */}
        <Button type="submit" name="publish" value="true" disabled={pending}>
          {pending ? "Saving…" : "Publish"}
        </Button>
        <Button
          type="submit"
          name="publish"
          value="false"
          variant="outline"
          disabled={pending}
        >
          Save draft
        </Button>
      </div>
    </form>
  );
}
