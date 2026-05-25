import Link from "next/link";
import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Buy beef direct",
  description:
    "Buy quarters, halves, and retail cuts of beef direct from ranches.",
};

export const dynamic = "force-dynamic";

export default async function BeefPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("meat_products")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(60);

  return (
    <div className="container py-12">
      <h1 className="text-3xl font-bold tracking-tight">Buy beef direct</h1>
      <p className="mt-2 text-muted-foreground">
        Quarters, halves, and retail cuts straight from the ranch.
      </p>

      {!products || products.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          No beef products listed yet. Check back soon.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link key={p.id} href={`/beef/${p.id}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="space-y-2 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold">{p.name}</h2>
                    <Badge variant="outline">{p.product_type.replace("_", " ")}</Badge>
                  </div>
                  <p className="font-medium text-primary">
                    {p.price_usd == null
                      ? "Contact for price"
                      : `$${p.price_usd.toLocaleString()} / ${p.unit}`}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
