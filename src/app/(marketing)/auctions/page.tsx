import Link from "next/link";
import { Gavel, MapPin } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Section, SectionHeading } from "@/modules/marketing/components/section";
import { FeatureHero } from "@/modules/marketing/components/feature-hero";
import { AuctionLotCard } from "@/modules/marketing/components/preview-cards";
import { MarketingCTA } from "@/modules/marketing/components/cta";
import { demoAuctionLots } from "@/modules/marketing/demo-data";
import { createClient } from "@/lib/supabase/server";
import type { Auction } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "Live & upcoming auctions",
  description: "Browse live and upcoming online livestock auctions.",
};

export const dynamic = "force-dynamic";

async function loadOpenAuctions(): Promise<Auction[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("auctions")
      .select("*")
      .in("status", ["live", "scheduled"])
      .order("starts_at", { ascending: true })
      .limit(40);
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function AuctionsPage() {
  const auctions = await loadOpenAuctions();
  const live = auctions.filter((a) => a.status === "live");
  const upcoming = auctions.filter((a) => a.status === "scheduled");

  return (
    <>
      <FeatureHero
        eyebrow="Auctions"
        title="Live & upcoming livestock auctions"
        subtitle="Timed online sales from sale barns and breeders. Browse the catalog freely; log in to place a bid."
        primaryCta={{ label: "Run your own sale", href: "/signup" }}
        secondaryCta={{ label: "See pricing", href: "/pricing" }}
      />

      <Section>
        {auctions.length > 0 ? (
          <div className="space-y-10">
            {live.length > 0 && (
              <div>
                <SectionHeading eyebrow="Bidding now" title="Live sales" />
                <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {live.map((a) => (
                    <PublicAuctionCard key={a.id} auction={a} live />
                  ))}
                </div>
              </div>
            )}
            {upcoming.length > 0 && (
              <div>
                <SectionHeading eyebrow="On the calendar" title="Upcoming sales" />
                <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((a) => (
                    <PublicAuctionCard key={a.id} auction={a} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mb-8 rounded-lg border border-dashed border-accent/40 bg-accent/5 p-5 text-sm">
              <span className="font-semibold">No live sales right now.</span> Here
              are example lots so you can see how a sale looks.{" "}
              <Link href="/signup" className="font-medium text-primary underline">
                Run the first one.
              </Link>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {demoAuctionLots.map((lot) => (
                <AuctionLotCard key={lot.id} lot={lot} />
              ))}
            </div>
          </>
        )}
      </Section>

      <MarketingCTA
        title="Take your sale online"
        subtitle="Catalog lots, open bidding, and settle against reserve — all in one place."
      />
    </>
  );
}

function PublicAuctionCard({ auction, live }: { auction: Auction; live?: boolean }) {
  return (
    <Link href={`/auctions/${auction.id}`}>
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-start justify-between gap-2">
            <Gavel className="size-5 text-accent" />
            <Badge variant={live ? "success" : "secondary"}>
              {live ? "Live" : "Upcoming"}
            </Badge>
          </div>
          <h3 className="font-display text-lg font-semibold leading-snug">
            {auction.title}
          </h3>
          {auction.location && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" /> {auction.location}
            </p>
          )}
          <p className="border-t border-border pt-3 text-sm text-muted-foreground">
            {auction.starts_at
              ? new Date(auction.starts_at).toLocaleString()
              : "Time TBA"}
          </p>
          <Button variant="outline" size="sm" className="w-full">
            View catalog
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
