import Link from "next/link";
import { Plus, Lock, Gavel } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { EmptyState } from "@/modules/dashboard/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";
import { canAccessAuctionTools } from "@/modules/billing/entitlements";
import type { AuctionStatus } from "@/lib/db/types";

export const metadata: Metadata = { title: "Auctions" };

const statusVariant: Record<AuctionStatus, "secondary" | "success" | "outline"> = {
  scheduled: "secondary",
  live: "success",
  ended: "outline",
  cancelled: "outline",
};

export default async function DashboardAuctionsPage() {
  const { organization } = await requireOrg();
  const unlocked = await canAccessAuctionTools();

  if (!unlocked) {
    return (
      <>
        <PageHeader title="Auctions" description="Run timed and live online sales." />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Lock className="size-6" />
            </span>
            <div>
              <h3 className="flex items-center justify-center gap-2 font-display text-lg font-semibold">
                <Gavel className="size-5" /> Auctions are an Enterprise feature
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Upgrade to the Auction House / Enterprise plan to create sales,
                catalog lots, and take live bids.
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/billing">View plans</Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const supabase = await createClient();
  const { data: auctions } = await supabase
    .from("auctions")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Auctions"
        description="Create sales, catalog lots, and take live bids."
        action={
          <Button asChild>
            <Link href="/dashboard/auctions/new">
              <Plus className="size-4" /> New sale
            </Link>
          </Button>
        }
      />

      {!auctions || auctions.length === 0 ? (
        <EmptyState
          title="No sales yet"
          description="Create your first sale, add some lots, and open it for bidding when you're ready."
          action={
            <Button asChild>
              <Link href="/dashboard/auctions/new">Create your first sale</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {auctions.map((a) => (
            <Link key={a.id} href={`/dashboard/auctions/${a.id}`}>
              <Card className="flex items-center justify-between p-4 transition-colors hover:border-primary/40">
                <div className="min-w-0">
                  <p className="truncate font-display font-semibold">{a.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.starts_at ? new Date(a.starts_at).toLocaleString() : "No start time"}
                  </p>
                </div>
                <Badge variant={statusVariant[a.status]}>{a.status}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
