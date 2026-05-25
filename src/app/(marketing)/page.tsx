import Link from "next/link";
import { Search, Beef, Gavel, ShieldCheck, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { CatalogCard, CatalogGrid } from "@/components/catalog/catalog-card";
import { DemoListingCard } from "@/modules/marketing/components/preview-cards";
import { demoCattleListings, formatUsd } from "@/modules/marketing/demo-data";
import type { LivestockListing } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "OpenRange — Buy & sell livestock direct",
  description:
    "A rugged online marketplace for cattle and livestock, direct beef, and online auctions — straight from the ranch.",
};

export const dynamic = "force-dynamic";

async function recentListings(): Promise<LivestockListing[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("livestock_listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(8);
    return data ?? [];
  } catch {
    return [];
  }
}

const categories = [
  { label: "Cattle & livestock", href: "/listings" },
  { label: "Beef direct", href: "/beef" },
  { label: "Auctions", href: "/auctions" },
];

export default async function HomePage() {
  const listings = await recentListings();

  return (
    <>
      {/* Compact, marketplace-first hero with search */}
      <section className="border-b border-border bg-secondary/40">
        <div className="container py-8 md:py-12">
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Buy &amp; sell livestock, direct
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Cattle, genetics, beef shares, and online auctions — straight from the ranch.
          </p>

          <form action="/listings" method="get" className="mt-5 flex max-w-xl gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                placeholder="Search cattle, breeds, location…"
                className="h-12 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Search the marketplace"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 px-5">Search</Button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:border-primary/50"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Fresh on the market */}
      <section className="container py-8 md:py-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-xl font-bold tracking-tight">Fresh on the market</h2>
          <Link href="/listings" className="flex items-center gap-1 text-sm font-medium text-primary">
            See all <ArrowRight className="size-4" />
          </Link>
        </div>
        {listings.length > 0 ? (
          <CatalogGrid>
            {listings.map((l) => (
              <CatalogCard
                key={l.id}
                href={`/listings/${l.id}`}
                photos={l.photos}
                title={l.title}
                price={formatUsd(l.price_usd)}
                subtitle={l.seller_name ?? undefined}
                meta={[l.breed, l.location].filter(Boolean).join(" · ") || undefined}
                tag={l.species}
              />
            ))}
          </CatalogGrid>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {demoCattleListings.map((l) => (
              <DemoListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>

      {/* Beef + Auctions entry points */}
      <section className="container grid gap-4 pb-10 sm:grid-cols-2">
        <Link
          href="/beef"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-5 hover:border-primary/40"
        >
          <div>
            <Beef className="size-6 text-accent" />
            <h3 className="mt-2 font-display text-lg font-bold">Beef, direct from the ranch</h3>
            <p className="text-sm text-muted-foreground">Quarters, halves, and retail cuts.</p>
          </div>
          <ArrowRight className="size-5 text-muted-foreground" />
        </Link>
        <Link
          href="/auctions"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-5 hover:border-primary/40"
        >
          <div>
            <Gavel className="size-6 text-accent" />
            <h3 className="mt-2 font-display text-lg font-bold">Live &amp; timed auctions</h3>
            <p className="text-sm text-muted-foreground">Bid online from the barn or the pickup.</p>
          </div>
          <ArrowRight className="size-5 text-muted-foreground" />
        </Link>
      </section>

      {/* Sell / trust — short, practical */}
      <section className="border-y border-border bg-secondary/30">
        <div className="container grid gap-6 py-10 md:grid-cols-3">
          {[
            { title: "List in minutes", body: "Post stock or beef with photos and pricing. Buyers reach you directly." },
            { title: "Keep your customers", body: "A simple CRM and an assistant that answers inquiries when you can't." },
            { title: "Your data stays yours", body: "Records isolated per ranch at the database level. No long-term contracts." },
          ].map((f) => (
            <div key={f.title}>
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink text-ink-foreground">
        <div className="container flex flex-col items-center gap-5 py-12 text-center">
          <ShieldCheck className="size-7 text-accent" />
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Run your operation on OpenRange
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">Start selling</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-ink-foreground/25 bg-transparent text-ink-foreground hover:bg-ink-foreground/10"
            >
              <Link href="/listings">Browse the market</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
