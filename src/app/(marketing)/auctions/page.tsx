import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/modules/marketing/components/section";
import { FeatureHero } from "@/modules/marketing/components/feature-hero";
import { AuctionLotCard } from "@/modules/marketing/components/preview-cards";
import { MarketingCTA } from "@/modules/marketing/components/cta";
import { demoAuctionLots } from "@/modules/marketing/demo-data";

export const metadata: Metadata = {
  title: "Online livestock auctions",
  description:
    "Run timed and live online livestock auctions for sale barns and production sales.",
};

const steps = [
  { n: 1, title: "Catalog your lots", body: "Add consignments with photos, head count, weights, and notes — each gets its own lot page." },
  { n: 2, title: "Open the sale", body: "Buyers bid online from the barn or the pickup. Timed sales close on a schedule; live sales run in real time." },
  { n: 3, title: "Settle up", body: "Winning bids, buyers, and contacts flow into your records so settlement and follow-up are simple." },
];

export default function AuctionsPage() {
  return (
    <>
      <FeatureHero
        eyebrow="Auctions"
        title="Online auctions built for the sale barn"
        subtitle="Take your timed and live sales online without losing the feel of a real auction. Catalog lots, take consignments, and let buyers bid from anywhere."
        primaryCta={{ label: "Talk to us about auctions", href: "/contact" }}
        secondaryCta={{ label: "See pricing", href: "/pricing" }}
      />

      <Section>
        <SectionHeading eyebrow="How it works" title="From consignment to settlement" />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-lg border border-border p-6">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">
                {s.n}
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeading
          eyebrow="Sale catalog"
          title="A clean catalog buyers can actually read"
          description="Example lots from a timed sale. Real catalogs are built from your consignments."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {demoAuctionLots.map((lot) => (
            <AuctionLotCard key={lot.id} lot={lot} />
          ))}
        </div>
      </Section>

      <Section>
        <div className="rounded-lg border border-border bg-secondary/40 p-8 text-center md:p-12">
          <h2 className="font-display text-2xl font-bold">
            Auction tools are part of the Enterprise plan
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Live and timed bidding is in active development. The data model is
            built, and Enterprise customers get early access as it rolls out.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild>
              <Link href="/pricing">View Enterprise plan</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contact">Request early access</Link>
            </Button>
          </div>
        </div>
      </Section>

      <MarketingCTA
        title="Run your next sale on OpenRange"
        subtitle="Tell us about your sale barn and we'll help you get set up."
      />
    </>
  );
}
