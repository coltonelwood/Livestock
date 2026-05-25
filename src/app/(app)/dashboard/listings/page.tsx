import Link from "next/link";
import { Plus, Beef, Tag } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { EmptyState } from "@/modules/dashboard/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";
import type { ListingStatus } from "@/lib/db/types";

export const metadata: Metadata = { title: "Listings" };

function statusBadge(status: ListingStatus) {
  const variant =
    status === "active" ? "success" : status === "draft" ? "secondary" : "outline";
  return <Badge variant={variant} className="shrink-0">{status}</Badge>;
}

function price(p: number | null) {
  return p == null ? "—" : `$${p.toLocaleString()}`;
}

export default async function ListingsPage() {
  const { organization } = await requireOrg();
  const supabase = await createClient();
  const [{ data: listings }, { data: products }] = await Promise.all([
    supabase
      .from("livestock_listings")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("meat_products")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader
        title="Listings"
        description="Livestock for sale and direct-to-consumer beef."
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/listings/meat/new">
                <Beef className="size-4" /> Meat product
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/listings/new">
                <Plus className="size-4" /> Livestock listing
              </Link>
            </Button>
          </div>
        }
      />

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Tag className="size-4" /> Livestock listings
        </h2>
        {!listings || listings.length === 0 ? (
          <EmptyState title="No livestock listings" description="Create a listing to reach buyers on the marketplace." />
        ) : (
          <div className="grid gap-3">
            {listings.map((l) => (
              <Link key={l.id} href={`/dashboard/listings/${l.id}`} className="block min-w-0">
                <Card className="flex items-center justify-between gap-3 p-4 transition-colors hover:border-primary/40">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {l.breed ? `${l.breed} · ` : ""}{l.species} · qty {l.quantity} · {price(l.price_usd)}
                    </p>
                  </div>
                  {statusBadge(l.status)}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Beef className="size-4" /> Beef / meat products
        </h2>
        {!products || products.length === 0 ? (
          <EmptyState title="No meat products" description="List quarters, halves, and retail cuts for direct sale." />
        ) : (
          <div className="grid gap-3">
            {products.map((p) => (
              <Link key={p.id} href={`/dashboard/listings/meat/${p.id}`} className="block min-w-0">
                <Card className="flex items-center justify-between gap-3 p-4 transition-colors hover:border-primary/40">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.product_type.replace("_", " ")} · {price(p.price_usd)} / {p.unit}
                    </p>
                  </div>
                  {statusBadge(p.status)}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
