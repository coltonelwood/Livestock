import Link from "next/link";
import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Livestock for sale",
  description: "Browse cattle and livestock listings from ranches and breeders.",
};

export const dynamic = "force-dynamic";

export default async function PublicListingsPage() {
  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("livestock_listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <div className="container py-12">
      <h1 className="text-3xl font-bold tracking-tight">Livestock for sale</h1>
      <p className="mt-2 text-muted-foreground">
        Cattle and livestock from ranches and breeders on OpenRange.
      </p>

      {!listings || listings.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          No active listings yet. Check back soon.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <Link key={l.id} href={`/listings/${l.id}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="space-y-2 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold">{l.title}</h2>
                    <Badge variant="outline">{l.species}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[l.breed, l.location].filter(Boolean).join(" · ")}
                  </p>
                  <p className="font-medium text-primary">
                    {l.price_usd == null ? "Contact for price" : `$${l.price_usd.toLocaleString()}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{l.seller_name}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
