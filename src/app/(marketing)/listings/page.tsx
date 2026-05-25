import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/server";
import { demoCattleListings, formatUsd } from "@/modules/marketing/demo-data";
import { DemoListingCard } from "@/modules/marketing/components/preview-cards";
import { FilterShell } from "@/modules/search/components/filter-shell";
import { Pagination } from "@/modules/search/components/pagination";
import { parseListingFilters, rangeFor, SPECIES } from "@/modules/search/query";
import type { LivestockListing } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "Livestock Marketplace",
  description: "Search cattle and livestock listings from ranches and breeders.",
};

export const dynamic = "force-dynamic";

export default async function PublicListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const f = parseListingFilters(sp);
  const { from, to } = rangeFor(f.page);

  let listings: LivestockListing[] = [];
  let count = 0;
  try {
    const supabase = await createClient();
    let q = supabase
      .from("livestock_listings")
      .select("*", { count: "exact" })
      .eq("status", "active");
    if (f.species) q = q.eq("species", f.species);
    if (f.q) q = q.or(`title.ilike.%${f.q}%,breed.ilike.%${f.q}%`);
    if (f.breed) q = q.ilike("breed", `%${f.breed}%`);
    if (f.location) q = q.ilike("location", `%${f.location}%`);
    if (f.minPrice != null) q = q.gte("price_usd", f.minPrice);
    if (f.maxPrice != null) q = q.lte("price_usd", f.maxPrice);
    if (f.sort === "price_asc") q = q.order("price_usd", { ascending: true, nullsFirst: false });
    else if (f.sort === "price_desc") q = q.order("price_usd", { ascending: false, nullsFirst: false });
    else q = q.order("created_at", { ascending: false });

    const res = await q.range(from, to);
    listings = res.data ?? [];
    count = res.count ?? 0;
  } catch {
    listings = [];
    count = 0;
  }

  const hasFilters =
    !!(f.q || f.species || f.breed || f.location || f.minPrice != null || f.maxPrice != null);
  const baseParams = {
    q: f.q, species: f.species, breed: f.breed, location: f.location,
    min: f.minPrice, max: f.maxPrice, sort: f.sort === "newest" ? undefined : f.sort,
  };

  return (
    <>
      <section className="border-b border-border bg-ink text-ink-foreground">
        <div className="container py-12">
          <p className="eyebrow">Livestock Marketplace</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Cattle &amp; livestock for sale
          </h1>
          <p className="mt-3 max-w-2xl text-ink-foreground/70">
            Search listings from ranches and breeders. No account needed to browse.
          </p>
        </div>
      </section>

      <div className="container py-10">
        <FilterShell basePath="/listings">
          <Field label="Search">
            <Input name="q" defaultValue={f.q ?? ""} placeholder="Angus, heifers…" />
          </Field>
          <Field label="Species">
            <Select name="species" defaultValue={f.species ?? ""}>
              <option value="">Any</option>
              {SPECIES.map((s) => (
                <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Breed">
            <Input name="breed" defaultValue={f.breed ?? ""} placeholder="e.g. Hereford" />
          </Field>
          <Field label="Location">
            <Input name="location" defaultValue={f.location ?? ""} placeholder="State / county" />
          </Field>
          <Field label="Min price">
            <Input name="min" type="number" min="0" defaultValue={f.minPrice ?? ""} />
          </Field>
          <Field label="Max price">
            <Input name="max" type="number" min="0" defaultValue={f.maxPrice ?? ""} />
          </Field>
          <Field label="Sort">
            <Select name="sort" defaultValue={f.sort}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </Select>
          </Field>
        </FilterShell>

        <div className="mt-8">
          {listings.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">{count} listing{count === 1 ? "" : "s"}</p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((l) => (
                  <Link key={l.id} href={`/listings/${l.id}`}>
                    <Card className="h-full transition-colors hover:border-primary/40">
                      <CardContent className="space-y-3 pt-6">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="font-display text-lg font-semibold leading-snug">{l.title}</h2>
                          <Badge variant="outline">{l.species}</Badge>
                        </div>
                        {(l.breed || l.location) && (
                          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="size-3.5" />
                            {[l.breed, l.location].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        <div className="border-t border-border pt-3">
                          <p className="text-lg font-bold text-primary">{formatUsd(l.price_usd)}</p>
                          <p className="text-xs text-muted-foreground">{l.seller_name}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              <Pagination basePath="/listings" page={f.page} count={count} baseParams={baseParams} />
            </>
          ) : hasFilters ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="font-semibold">No listings match your filters</p>
              <p className="mt-1 text-sm text-muted-foreground">Try widening your search.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/listings">Clear filters</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8 rounded-lg border border-dashed border-accent/40 bg-accent/5 p-5 text-sm">
                <span className="font-semibold">No live listings yet.</span> Example listings shown below.{" "}
                <Link href="/signup" className="font-medium text-primary underline">Post the first one.</Link>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {demoCattleListings.map((l) => (
                  <DemoListingCard key={l.id} listing={l} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
