"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { placeBidAction } from "@/modules/auctions/actions";
import type { BidState } from "@/modules/auctions/schema";

export function BidForm({
  lotId,
  currentBid,
  minNextBid,
  isAuthed,
  isSeller,
}: {
  lotId: string;
  currentBid: number | null;
  minNextBid: number;
  isAuthed: boolean;
  isSeller: boolean;
}) {
  const [state, action, pending] = useActionState<BidState, FormData>(
    placeBidAction,
    {},
  );

  // Authoritative values come back from the server on success.
  const displayCurrent = state.ok && state.currentBid != null ? state.currentBid : currentBid;
  const min = state.ok && state.minNextBid != null ? state.minNextBid : minNextBid;

  if (isSeller) {
    return (
      <p className="text-sm text-muted-foreground">
        This is your lot — you can&apos;t bid on it.
      </p>
    );
  }

  if (!isAuthed) {
    return (
      <Button asChild variant="outline" className="w-full">
        <Link href={`/login?next=/auctions`}>Log in to bid</Link>
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="lotId" value={lotId} />
      <div className="flex gap-2">
        <Input
          name="amount"
          type="number"
          min={min}
          step="1"
          defaultValue={min}
          aria-label="Your bid"
          required
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Bidding…" : "Bid"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {displayCurrent == null
          ? `Opening bid $${min.toLocaleString()}`
          : `Current $${displayCurrent.toLocaleString()} · min next $${min.toLocaleString()}`}
      </p>
      {state.ok && (
        <p className="text-xs text-emerald-600" role="status">
          You&apos;re the high bidder at ${state.currentBid?.toLocaleString()}.
        </p>
      )}
      {state.error && (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
