import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/server";
import { demoBeefBoxes, formatUsd } from "@/modules/marketing/demo-data";
import { BeefBoxCard } from "@/modules/marketing/components/preview-cards";
import { CatalogCard, CatalogGrid } from "@/components/catalog/catalog-card";
import { FilterShell, FilterField } from "@/modules/search/components/filter-shell";
import { Pagination } from "@/modules/search/components/pagination";
import { parseProductFilters, rangeFor, PRODUCT_TYPES } from "@/modules/search/query";
import type { MeatProduct } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "Beef Direct",
  description: "Search quarters, halves, and retail cuts of beef direct from ranches.",
};

export const dynamic = "force-dynamic";

export default async function BeefPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const f = parseProductFilters(sp);
  const { from, to } = rangeFor(f.page);

  let products: MeatProduct[] = [];
  let count = 0;
  try {
    const supabase = await createClient();
    let q = supabase.from("meat_products").select("*", { count: "exact" }).eq("status", "active");
    if (f.q) q = q.ilike("name", `%${f.q}%`);
    if (f.productType) q = q.eq("product_type", f.productType);
    if (f.minPrice != null) q = q.gte("price_usd", f.minPrice);
    if (f.maxPrice != null) q = q.lte("price_usd", f.maxPrice);
    if (f.inStock) q = q.or("inventory.is.null,inventory.gt.0");
    if (f.sort === "price_asc") q = q.order("price_usd", { ascending: true, nullsFirst: false });
    else if (f.sort === "price_desc") q = q.order("price_usd", { ascending: false, nullsFirst: false });
    else q = q.order("created_at", { ascending: false });
    const res = await q.range(from, to);
    products = res.data ?? [];
    count = res.count ?? 0;
  } catch {
    products = [];
    count = 0;
  }

  const hasFilters = !!(f.q || f.productType || f.minPrice != null || f.maxPrice != null || f.inStock);
  const baseParams = {
    q: f.q, type: f.productType, min: f.minPrice, max: f.maxPrice,
    stock: f.inStock ? "1" : undefined, sort: f.sort === "newest" ? undefined : f.sort,
  };

  return (
    <>
      <section className="border-b border-border bg-ink text-ink-foreground">
        <div className="container py-12">
          <p className="eyebrow">Beef Direct</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Beef straight from the ranch
          </h1>
          <p className="mt-3 max-w-2xl text-ink-foreground/70">
            Search quarters, halves, wholes, and retail cuts sold direct.
          </p>
        </div>
      </section>

      <div className="container py-10">
        <FilterShell basePath="/beef">
          <FilterField label="Search">
            <Input name="q" defaultValue={f.q ?? ""} placeholder="Ribeye, half beef…" />
          </FilterField>
          <FilterField label="Type">
            <Select name="type" defaultValue={f.productType ?? ""}>
              <option value="">Any</option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace("_", " ")}</option>
              ))}
            </Select>
          </FilterField>
          <FilterField label="Sort">
            <Select name="sort" defaultValue={f.sort}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </Select>
          </FilterField>
          <FilterField label="Min price">
            <Input name="min" type="number" min="0" defaultValue={f.minPrice ?? ""} />
          </FilterField>
          <FilterField label="Max price">
            <Input name="max" type="number" min="0" defaultValue={f.maxPrice ?? ""} />
          </FilterField>
          <FilterField label="Availability">
            <label className="flex h-10 items-center gap-2 text-sm">
              <input type="checkbox" name="stock" value="1" defaultChecked={f.inStock} className="size-4" />
              In stock only
            </label>
          </FilterField>
        </FilterShell>

        <div className="mt-8">
          {products.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">{count} product{count === 1 ? "" : "s"}</p>
              <CatalogGrid>
                {products.map((p) => {
                  const soldOut = p.inventory != null && p.inventory <= 0;
                  return (
                    <CatalogCard
                      key={p.id}
                      href={`/beef/${p.id}`}
                      photos={p.photos}
                      title={p.name}
                      price={`${formatUsd(p.price_usd)} / ${p.unit}`}
                      subtitle={p.seller_name ?? undefined}
                      tag={p.product_type.replace("_", " ")}
                      soldOut={soldOut}
                    />
                  );
                })}
              </CatalogGrid>
              <Pagination basePath="/beef" page={f.page} count={count} baseParams={baseParams} />
            </>
          ) : hasFilters ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="font-semibold">No products match your filters</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/beef">Clear filters</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-8 rounded-lg border border-dashed border-accent/40 bg-accent/5 p-5 text-sm">
                <span className="font-semibold">No beef listed yet.</span> Example products shown below.{" "}
                <Link href="/signup" className="font-medium text-primary underline">List yours.</Link>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {demoBeefBoxes.map((b) => (
                  <BeefBoxCard key={b.id} box={b} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
