import Link from "next/link";
import { Gavel, MapPin } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Section } from "@/modules/marketing/components/section";
import { FeatureHero } from "@/modules/marketing/components/feature-hero";
import { AuctionLotCard } from "@/modules/marketing/components/preview-cards";
import { MarketingCTA } from "@/modules/marketing/components/cta";
import { demoAuctionLots } from "@/modules/marketing/demo-data";
import { FilterShell, FilterField } from "@/modules/search/components/filter-shell";
import { Pagination } from "@/modules/search/components/pagination";
import { parseAuctionFilters, rangeFor, AUCTION_STATUSES } from "@/modules/search/query";
import { createClient } from "@/lib/supabase/server";
import type { Auction } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "Live & upcoming auctions",
  description: "Search live and upcoming online livestock auctions.",
};

export const dynamic = "force-dynamic";

export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const f = parseAuctionFilters(sp);
  const { from, to } = rangeFor(f.page);

  let auctions: Auction[] = [];
  let count = 0;
  try {
    const supabase = await createClient();
    let q = supabase.from("auctions").select("*", { count: "exact" });
    if (f.status) q = q.eq("status", f.status);
    else q = q.in("status", ["live", "scheduled"]);
    if (f.q) q = q.ilike("title", `%${f.q}%`);
    if (f.location) q = q.ilike("location", `%${f.location}%`);
    const res = await q.order("starts_at", { ascending: true }).range(from, to);
    auctions = res.data ?? [];
    count = res.count ?? 0;
  } catch {
    auctions = [];
    count = 0;
  }

  const hasFilters = !!(f.q || f.status || f.location);
  const baseParams = { q: f.q, status: f.status, location: f.location };

  return (
    <>
      <FeatureHero
        eyebrow="Auctions"
        title="Live & upcoming livestock auctions"
        subtitle="Timed online sales from sale barns and breeders. Browse freely; log in to bid."
        primaryCta={{ label: "Run your own sale", href: "/signup" }}
        secondaryCta={{ label: "See pricing", href: "/pricing" }}
      />

      <Section>
        <FilterShell basePath="/auctions">
          <FilterField label="Search">
            <Input name="q" defaultValue={f.q ?? ""} placeholder="Sale name…" />
          </FilterField>
          <FilterField label="Status">
            <Select name="status" defaultValue={f.status ?? ""}>
              <option value="">Live &amp; upcoming</option>
              {AUCTION_STATUSES.map((s) => (
                <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="Location">
            <Input name="location" defaultValue={f.location ?? ""} placeholder="State / county" />
          </FilterField>
        </FilterShell>

        <div className="mt-8">
          {auctions.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">{count} sale{count === 1 ? "" : "s"}</p>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {auctions.map((a) => (
                  <PublicAuctionCard key={a.id} auction={a} />
                ))}
              </div>
              <Pagination basePath="/auctions" page={f.page} count={count} baseParams={baseParams} />
            </>
          ) : hasFilters ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="font-semibold">No sales match your search</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/auctions">Clear filters</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8 rounded-lg border border-dashed border-accent/40 bg-accent/5 p-5 text-sm">
                <span className="font-semibold">No live sales right now.</span> Example lots shown below.{" "}
                <Link href="/signup" className="font-medium text-primary underline">Run the first one.</Link>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                {demoAuctionLots.map((lot) => (
                  <AuctionLotCard key={lot.id} lot={lot} />
                ))}
              </div>
            </>
          )}
        </div>
      </Section>

      <MarketingCTA title="Take your sale online" subtitle="Catalog lots, open bidding, settle against reserve." />
    </>
  );
}

function PublicAuctionCard({ auction }: { auction: Auction }) {
  const live = auction.status === "live";
  return (
    <Link href={`/auctions/${auction.id}`}>
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-start justify-between gap-2">
            <Gavel className="size-5 text-accent" />
            <Badge variant={live ? "success" : auction.status === "ended" ? "outline" : "secondary"}>
              {live ? "Live" : auction.status === "ended" ? "Ended" : "Upcoming"}
            </Badge>
          </div>
          <h3 className="font-display text-lg font-semibold leading-snug">{auction.title}</h3>
          {auction.location && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" /> {auction.location}
            </p>
          )}
          <p className="border-t border-border pt-3 text-sm text-muted-foreground">
            {auction.starts_at ? new Date(auction.starts_at).toLocaleString() : "Time TBA"}
          </p>
          <Button variant="outline" size="sm" className="w-full">View catalog</Button>
        </CardContent>
      </Card>
    </Link>
  );
}
