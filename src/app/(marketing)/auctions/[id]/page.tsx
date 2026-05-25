import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Countdown } from "@/modules/auctions/components/countdown";
import { BidForm } from "@/modules/auctions/components/bid-form";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { minimumBid } from "@/modules/auctions/schema";
import type { Auction, AuctionLot, Bid } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("auctions").select("title").eq("id", id).maybeSingle();
    return { title: data?.title ?? "Auction" };
  } catch {
    return { title: "Auction" };
  }
}

function money(v: number | null) {
  return v == null ? "—" : `$${v.toLocaleString()}`;
}

export default async function PublicAuctionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let auction: Auction | null = null;
  let lots: AuctionLot[] = [];
  let bids: Bid[] = [];
  let isSeller = false;
  let isAuthed = false;

  try {
    const supabase = await createClient();
    const { data: a } = await supabase
      .from("auctions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    auction = a;
    if (!auction) notFound();

    const { data: lotRows } = await supabase
      .from("auction_lots")
      .select("*")
      .eq("auction_id", id)
      .order("lot_number", { ascending: true });
    lots = lotRows ?? [];

    if (lots.length > 0) {
      const { data: bidRows } = await supabase
        .from("bids")
        .select("*")
        .in("lot_id", lots.map((l) => l.id))
        .order("created_at", { ascending: false })
        .limit(100);
      bids = bidRows ?? [];
    }

    const user = await getUser();
    isAuthed = !!user;
    if (user && auction) {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", auction.organization_id)
        .eq("user_id", user.id)
        .maybeSingle();
      isSeller = !!membership;
    }
  } catch {
    notFound();
  }

  if (!auction) notFound();

  const bidsByLot = new Map<string, Bid[]>();
  for (const b of bids) {
    if (!b.lot_id) continue;
    const arr = bidsByLot.get(b.lot_id) ?? [];
    arr.push(b);
    bidsByLot.set(b.lot_id, arr);
  }

  const live = auction.status === "live";

  return (
    <div className="container max-w-4xl py-10">
      <Link
        href="/auctions"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All auctions
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            {auction.title}
          </h1>
          {auction.location && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" /> {auction.location}
            </p>
          )}
        </div>
        <div className="text-right">
          <Badge variant={live ? "success" : auction.status === "scheduled" ? "secondary" : "outline"}>
            {auction.status}
          </Badge>
          {live && auction.ends_at && (
            <p className="mt-1 text-sm font-medium text-accent">
              <Countdown to={auction.ends_at} prefix="Sale ends in" />
            </p>
          )}
          {auction.status === "scheduled" && auction.starts_at && (
            <p className="mt-1 text-sm text-muted-foreground">
              <Countdown to={auction.starts_at} prefix="Opens in" />
            </p>
          )}
        </div>
      </div>

      {auction.description && (
        <p className="mt-4 max-w-2xl text-muted-foreground">{auction.description}</p>
      )}

      <h2 className="mb-3 mt-8 font-display text-lg font-semibold">
        Catalog · {lots.length} {lots.length === 1 ? "lot" : "lots"}
      </h2>

      {lots.length === 0 ? (
        <p className="text-muted-foreground">No lots have been cataloged yet.</p>
      ) : (
        <div className="grid gap-4">
          {lots.map((lot) => {
            const min = minimumBid(lot.current_bid_usd, lot.opening_bid_usd, lot.bid_increment_usd);
            const history = bidsByLot.get(lot.id) ?? [];
            const closesAt = lot.closes_at ?? auction!.ends_at;
            return (
              <Card key={lot.id}>
                <CardContent className="grid gap-5 pt-6 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Lot {lot.lot_number}
                    </p>
                    <h3 className="font-display text-lg font-semibold">{lot.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {lot.head_count} head · {lot.species}
                    </p>
                    {lot.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{lot.description}</p>
                    )}
                    {lot.status !== "open" && (
                      <Badge variant="outline" className="mt-3">
                        {lot.status === "sold" ? "Sold" : lot.status === "passed" ? "Passed (reserve not met)" : lot.status}
                        {lot.current_bid_usd != null && ` · ${money(lot.current_bid_usd)}`}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-3 rounded-md bg-secondary/40 p-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {lot.current_bid_usd == null ? "Opening bid" : "Current bid"}
                        </p>
                        <p className="text-2xl font-bold text-primary">
                          {money(lot.current_bid_usd ?? lot.opening_bid_usd)}
                        </p>
                        <p className="text-xs text-muted-foreground">{lot.bid_count} bids</p>
                      </div>
                      {live && lot.status === "open" && closesAt && (
                        <p className="text-xs font-medium text-accent">
                          <Countdown to={closesAt} />
                        </p>
                      )}
                    </div>

                    {live && lot.status === "open" ? (
                      <BidForm
                        lotId={lot.id}
                        currentBid={lot.current_bid_usd}
                        minNextBid={min}
                        isAuthed={isAuthed}
                        isSeller={isSeller}
                      />
                    ) : auction!.status === "scheduled" ? (
                      <p className="text-sm text-muted-foreground">Bidding opens when the sale goes live.</p>
                    ) : null}

                    {history.length > 0 && (
                      <div className="border-t border-border pt-2">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Bid history</p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {history.slice(0, 5).map((b) => (
                            <li key={b.id} className="flex justify-between">
                              <span>Bid {money(b.amount_usd)}</span>
                              <span>{new Date(b.created_at).toLocaleTimeString()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
