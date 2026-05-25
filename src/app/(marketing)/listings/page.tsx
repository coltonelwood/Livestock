import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { demoCattleListings, formatUsd } from "@/modules/marketing/demo-data";
import { DemoListingCard } from "@/modules/marketing/components/preview-cards";
import type { LivestockListing } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "Livestock Marketplace",
  description: "Browse cattle and livestock listings from ranches and breeders.",
};

export const dynamic = "force-dynamic";

async function loadActiveListings(): Promise<LivestockListing[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("livestock_listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(60);
    return data ?? [];
  } catch {
    // Supabase not configured in this environment — fall back to demo preview.
    return [];
  }
}

export default async function PublicListingsPage() {
  const listings = await loadActiveListings();

  return (
    <>
      <section className="border-b border-border bg-ink text-ink-foreground">
        <div className="container py-14">
          <p className="eyebrow">Livestock Marketplace</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Cattle &amp; livestock for sale
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-foreground/70">
            Listings from ranches and breeders across the country. See something
            you like? Reach out to the seller directly — no account needed to
            browse.
          </p>
          <Button asChild className="mt-6">
            <Link href="/signup">Post your own listing</Link>
          </Button>
        </div>
      </section>

      <div className="container py-12">
        {listings.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <Link key={l.id} href={`/listings/${l.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardContent className="space-y-3 pt-6">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-display text-lg font-semibold leading-snug">
                        {l.title}
                      </h2>
                      <Badge variant="outline">{l.species}</Badge>
                    </div>
                    {(l.breed || l.location) && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="size-3.5" />
                        {[l.breed, l.location].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <div className="border-t border-border pt-3">
                      <p className="text-lg font-bold text-primary">
                        {formatUsd(l.price_usd)}
                      </p>
                      <p className="text-xs text-muted-foreground">{l.seller_name}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-8 rounded-lg border border-dashed border-accent/40 bg-accent/5 p-5 text-sm">
              <span className="font-semibold">No live listings yet.</span> Below
              are example listings so you can see how the marketplace works.{" "}
              <Link href="/signup" className="font-medium text-primary underline">
                Post the first real one.
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {demoCattleListings.map((l) => (
                <DemoListingCard key={l.id} listing={l} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
