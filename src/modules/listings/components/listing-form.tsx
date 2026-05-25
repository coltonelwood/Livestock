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
      <div className="sticky bottom-20 z-20 -mx-4 flex flex-col gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:flex-row md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
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
