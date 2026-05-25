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
      <div className="flex flex-col gap-2 sm:flex-row">
        {/* The clicked button's name/value is submitted, choosing the status. */}
        <Button type="submit" name="publish" value="true" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Saving…" : "Publish"}
        </Button>
        <Button
          type="submit"
          name="publish"
          value="false"
          variant="outline"
          size="lg"
          disabled={pending}
          className="w-full sm:w-auto"
        >
          Save draft
        </Button>
      </div>
    </form>
  );
}
