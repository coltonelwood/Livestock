import Link from "next/link";
import { Lock, Gavel } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { EmptyState } from "@/modules/dashboard/components/empty-state";
import { canAccessAuctionTools } from "@/modules/billing/entitlements";

export const metadata: Metadata = { title: "Auctions" };

export default async function AuctionsPage() {
  const unlocked = await canAccessAuctionTools();

  return (
    <>
      <PageHeader
        title="Auctions"
        description="Live and timed auction tools for sale barns and breeders."
      />

      {unlocked ? (
        <EmptyState
          title="Auction tools are unlocked"
          description="Live and timed bidding is in active development. Your Enterprise plan includes early access — the data model is ready and the bidding UI is coming soon."
          action={
            <Button asChild variant="outline">
              <Link href="/dashboard/listings">Manage listings</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Lock className="size-6" />
            </span>
            <div>
              <h3 className="flex items-center justify-center gap-2 text-lg font-semibold">
                <Gavel className="size-5" /> Auctions are an Enterprise feature
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Upgrade to the Auction House / Enterprise plan to access auction
                tools, team members, and priority support.
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/billing">View plans</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
