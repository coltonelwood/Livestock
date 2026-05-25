import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Globe, Phone, Mail } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CatalogCard } from "@/components/catalog/catalog-card";
import { ChatWidget } from "@/modules/receptionist/components/chat-widget";
import { createClient } from "@/lib/supabase/server";
import { formatUsd } from "@/modules/marketing/demo-data";
import type { RanchProfile, LivestockListing, MeatProduct, Auction } from "@/lib/db/types";

export const dynamic = "force-dynamic";

async function loadStorefront(id: string) {
  try {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("ranch_profiles")
      .select("*")
      .eq("organization_id", id)
      .eq("is_public", true)
      .maybeSingle();
    if (!profile) return null;

    const [listings, products, auctions] = await Promise.all([
      supabase.from("livestock_listings").select("*").eq("organization_id", id).eq("status", "active").limit(12),
      supabase.from("meat_products").select("*").eq("organization_id", id).eq("status", "active").limit(12),
      supabase.from("auctions").select("*").eq("organization_id", id).in("status", ["live", "scheduled"]).limit(6),
    ]);
    return {
      profile: profile as RanchProfile,
      listings: (listings.data ?? []) as LivestockListing[],
      products: (products.data ?? []) as MeatProduct[],
      auctions: (auctions.data ?? []) as Auction[],
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await loadStorefront(id);
  if (!data) return { title: "Ranch" };
  return {
    title: data.profile.display_name ?? "Ranch storefront",
    description: data.profile.bio ?? `Livestock and beef from ${data.profile.display_name ?? "this ranch"}.`,
  };
}

export default async function RanchStorefrontPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadStorefront(id);
  if (!data) notFound();
  const { profile, listings, products, auctions } = data;
  const name = profile.display_name ?? "Ranch";

  return (
    <>
      <section className="bg-ink text-ink-foreground">
        <div className="container py-14">
          <p className="eyebrow">Ranch storefront</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">{name}</h1>
          {profile.bio && <p className="mt-4 max-w-2xl text-ink-foreground/70">{profile.bio}</p>}
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-foreground/70">
            {profile.location && <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {profile.location}</span>}
            {profile.website && <span className="flex items-center gap-1.5"><Globe className="size-4" /> {profile.website}</span>}
            {profile.phone && <span className="flex items-center gap-1.5"><Phone className="size-4" /> {profile.phone}</span>}
            {profile.email && <span className="flex items-center gap-1.5"><Mail className="size-4" /> {profile.email}</span>}
          </div>
        </div>
      </section>

      <div className="container space-y-12 py-12">
        {auctions.length > 0 && (
          <StoreSection title="Auctions">
            {auctions.map((a) => (
              <Link key={a.id} href={`/auctions/${a.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardContent className="space-y-2 pt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-semibold">{a.title}</h3>
                      <Badge variant={a.status === "live" ? "success" : "secondary"}>
                        {a.status === "live" ? "Live" : "Upcoming"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {a.starts_at ? new Date(a.starts_at).toLocaleString() : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </StoreSection>
        )}

        {listings.length > 0 && (
          <StoreSection title="Livestock for sale">
            {listings.map((l) => (
              <CatalogCard
                key={l.id}
                href={`/listings/${l.id}`}
                photos={l.photos}
                title={l.title}
                price={formatUsd(l.price_usd)}
                meta={l.breed ?? undefined}
                tag={l.species}
              />
            ))}
          </StoreSection>
        )}

        {products.length > 0 && (
          <StoreSection title="Beef direct">
            {products.map((p) => (
              <CatalogCard
                key={p.id}
                href={`/beef/${p.id}`}
                photos={p.photos}
                title={p.name}
                price={`${formatUsd(p.price_usd)} / ${p.unit}`}
                tag={p.product_type.replace("_", " ")}
                soldOut={p.inventory != null && p.inventory <= 0}
              />
            ))}
          </StoreSection>
        )}

        {listings.length === 0 && products.length === 0 && auctions.length === 0 && (
          <p className="text-center text-muted-foreground">
            {name} hasn&apos;t listed anything yet. Check back soon.
          </p>
        )}

        <div className="mx-auto max-w-md">
          <h2 className="mb-3 font-display text-lg font-semibold">Have a question?</h2>
          <ChatWidget organizationId={id} businessName={name} />
        </div>
      </div>
    </>
  );
}

function StoreSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 font-display text-2xl font-bold tracking-tight">{title}</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}
