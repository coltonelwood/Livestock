"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactAction, type ContactState } from "@/modules/marketing/actions";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(
    submitContactAction,
    {},
  );

  if (state.success) {
    return (
      <div className="rounded-md border bg-secondary p-6 text-center" role="status">
        <p className="font-semibold">Thanks — we&apos;ll be in touch soon.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep an eye on your inbox for a note from the OpenRange team.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={state.values?.name ?? ""} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={state.values?.email ?? ""} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="business">Business</Label>
        <Input
          id="business"
          name="business"
          placeholder="Ranch, sale barn, etc."
          defaultValue={state.values?.business ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">How can we help?</Label>
        <Textarea id="message" name="message" rows={4} defaultValue={state.values?.message ?? ""} />
      </div>
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Request a demo"}
      </Button>
    </form>
  );
}
