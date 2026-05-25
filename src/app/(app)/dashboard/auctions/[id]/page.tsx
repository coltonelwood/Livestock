import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Plus } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { EmptyState } from "@/modules/dashboard/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";
import { canAccessAuctionTools } from "@/modules/billing/entitlements";
import {
  addLotAction,
  startAuctionAction,
  endAuctionAction,
} from "@/modules/auctions/actions";
import type { AuctionActionState } from "@/modules/auctions/schema";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Manage sale" };

const species = ["cattle", "sheep", "goat", "horse", "swine", "poultry", "other"];

function money(v: number | null) {
  return v == null ? "—" : `$${v.toLocaleString()}`;
}

export default async function ManageAuctionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization } = await requireOrg();
  if (!(await canAccessAuctionTools())) redirect("/dashboard/auctions");

  const supabase = await createClient();
  const { data: auction } = await supabase
    .from("auctions")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!auction) notFound();

  const { data: lots } = await supabase
    .from("auction_lots")
    .select("*")
    .eq("auction_id", id)
    .order("lot_number", { ascending: true });

  const editable = auction.status === "scheduled";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard/auctions"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All sales
      </Link>

      <PageHeader
        title={auction.title}
        description={auction.location ?? undefined}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={auction.status === "live" ? "success" : "secondary"}>
              {auction.status}
            </Badge>
            {auction.status !== "cancelled" && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/auctions/${auction.id}`} target="_blank">
                  Public page <ExternalLink className="size-4" />
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {/* Status controls */}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <p className="text-sm text-muted-foreground">
            {auction.status === "scheduled" && "Add your lots, then open the sale for bidding."}
            {auction.status === "live" && "Bidding is open. End the sale to settle lots against reserve."}
            {auction.status === "ended" && "This sale has ended and lots are settled."}
          </p>
          {auction.status === "scheduled" && (lots?.length ?? 0) > 0 && (
            <form action={startAuctionAction}>
              <input type="hidden" name="auctionId" value={auction.id} />
              <Button type="submit">Go live</Button>
            </form>
          )}
          {auction.status === "live" && (
            <form action={endAuctionAction}>
              <input type="hidden" name="auctionId" value={auction.id} />
              <Button type="submit" variant="destructive">End sale</Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Lots */}
      <h2 className="mb-3 font-display text-lg font-semibold">Lots</h2>
      {!lots || lots.length === 0 ? (
        <EmptyState
          title="No lots yet"
          description="Add the animals or groups you're selling. Each lot takes its own bids."
        />
      ) : (
        <div className="mb-6 grid gap-2">
          {lots.map((lot) => (
            <Card key={lot.id} className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <p className="font-medium">
                  <span className="text-muted-foreground">Lot {lot.lot_number} · </span>
                  {lot.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  Opening {money(lot.opening_bid_usd)} · +{money(lot.bid_increment_usd)} ·{" "}
                  Reserve {money(lot.reserve_price_usd)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-primary">
                  {lot.current_bid_usd == null ? "No bids" : money(lot.current_bid_usd)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lot.bid_count} bids · {lot.status}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add lot */}
      {editable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="size-4" /> Add a lot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm<AuctionActionState> action={addLotAction} submitLabel="Add lot" pendingLabel="Adding…">
              <input type="hidden" name="auctionId" value={auction.id} />
              <div className="space-y-2">
                <Label htmlFor="title">Lot title</Label>
                <Input id="title" name="title" placeholder="Angus bred heifers" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="species">Species</Label>
                  <Select id="species" name="species" defaultValue="cattle">
                    {species.map((s) => (
                      <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="head_count">Head count</Label>
                  <Input id="head_count" name="head_count" type="number" min="1" defaultValue="1" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="opening_bid_usd">Opening bid</Label>
                  <Input id="opening_bid_usd" name="opening_bid_usd" type="number" min="0" step="1" defaultValue="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bid_increment_usd">Increment</Label>
                  <Input id="bid_increment_usd" name="bid_increment_usd" type="number" min="1" step="1" defaultValue="25" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reserve_price_usd">Reserve (optional)</Label>
                  <Input id="reserve_price_usd" name="reserve_price_usd" type="number" min="0" step="1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={2} />
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
