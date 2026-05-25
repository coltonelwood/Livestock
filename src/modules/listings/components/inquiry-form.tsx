"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitInquiryAction } from "@/modules/listings/actions";
import type { InquiryState } from "@/modules/listings/schema";

export function InquiryForm({
  listingType,
  listingId,
}: {
  listingType: "livestock" | "meat";
  listingId: string;
}) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(
    submitInquiryAction,
    {},
  );

  if (state.success) {
    return (
      <div className="rounded-md border bg-secondary p-4 text-sm" role="status">
        Thanks — your message was sent to the seller. They&apos;ll be in touch
        soon.
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="listingType" value={listingType} />
      <input type="hidden" name="listingId" value={listingId} />
      {/* Honeypot: hidden from people, attractive to bots. */}
      <div className="hidden" aria-hidden="true">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" defaultValue={state.values?.name ?? ""} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={state.values?.email ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={state.values?.phone ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          rows={3}
          placeholder="I'm interested in…"
          defaultValue={state.values?.message ?? ""}
        />
      </div>
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Contact seller"}
      </Button>
    </form>
  );
}
