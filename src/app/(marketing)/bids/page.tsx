import Link from "next/link";
import { Gavel } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { AuctionLot, Bid } from "@/lib/db/types";

export const metadata: Metadata = { title: "Your bids" };
export const dynamic = "force-dynamic";

const money = (n: number) => `$${n.toLocaleString()}`;

export default async function BuyerBidsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: myBids } = await supabase
    .from("bids")
    .select("*")
    .eq("bidder_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const lotIds = [...new Set((myBids ?? []).map((b) => b.lot_id).filter(Boolean))] as string[];
  let lots: AuctionLot[] = [];
  if (lotIds.length > 0) {
    const { data } = await supabase.from("auction_lots").select("*").in("id", lotIds);
    lots = data ?? [];
  }
  const lotById = new Map(lots.map((l) => [l.id, l]));

  // Highest bid I placed per lot.
  const myHighByLot = new Map<string, number>();
  for (const b of (myBids ?? []) as Bid[]) {
    if (!b.lot_id) continue;
    myHighByLot.set(b.lot_id, Math.max(myHighByLot.get(b.lot_id) ?? 0, Number(b.amount_usd)));
  }

  const rows = [...myHighByLot.entries()]
    .map(([lotId, myHigh]) => ({ lot: lotById.get(lotId), myHigh }))
    .filter((r): r is { lot: AuctionLot; myHigh: number } => !!r.lot);

  return (
    <div className="container max-w-3xl py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">Your bids</h1>

      {rows.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Gavel className="size-8 text-muted-foreground" />
            <p className="font-semibold">You haven&apos;t bid on anything yet</p>
            <Button asChild><Link href="/auctions">Browse auctions</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-3">
          {rows.map(({ lot, myHigh }) => {
            const winning = lot.current_bidder_id === user.id;
            const open = lot.status === "open";
            return (
              <Card key={lot.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{lot.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Your bid {money(myHigh)} · current {money(Number(lot.current_bid_usd ?? 0))}
                  </p>
                </div>
                {lot.status === "sold" && winning ? (
                  <Badge variant="success">Won</Badge>
                ) : lot.status === "sold" || lot.status === "passed" ? (
                  <Badge variant="outline">Lost</Badge>
                ) : open && winning ? (
                  <Badge variant="success">Winning</Badge>
                ) : (
                  <Badge variant="secondary">Outbid</Badge>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
