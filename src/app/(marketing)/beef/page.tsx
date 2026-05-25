import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { demoBeefBoxes, formatUsd } from "@/modules/marketing/demo-data";
import { BeefBoxCard } from "@/modules/marketing/components/preview-cards";
import type { MeatProduct } from "@/lib/db/types";

export const metadata: Metadata = {
  title: "Beef Direct",
  description:
    "Buy quarters, halves, and retail cuts of beef direct from ranches.",
};

export const dynamic = "force-dynamic";

async function loadActiveProducts(): Promise<MeatProduct[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("meat_products")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(60);
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function BeefPage() {
  const products = await loadActiveProducts();

  return (
    <>
      <section className="border-b border-border bg-ink text-ink-foreground">
        <div className="container py-14">
          <p className="eyebrow">Beef Direct</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Beef straight from the ranch
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-foreground/70">
            Quarters, halves, wholes, and retail cuts sold direct by the people
            who raised the animal. Browse freely — no account needed.
          </p>
          <Button asChild className="mt-6">
            <Link href="/signup">Sell your beef here</Link>
          </Button>
        </div>
      </section>

      <div className="container py-12">
        {products.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Link key={p.id} href={`/beef/${p.id}`}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardContent className="space-y-3 pt-6">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-display text-lg font-semibold">
                        {p.name}
                      </h2>
                      <Badge variant="outline">
                        {p.product_type.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="border-t border-border pt-3">
                      <p className="text-lg font-bold text-primary">
                        {formatUsd(p.price_usd)}
                        <span className="text-sm font-normal text-muted-foreground">
                          {" "}
                          / {p.unit}
                        </span>
                      </p>
                      {p.seller_name && (
                        <p className="text-xs text-muted-foreground">
                          {p.seller_name}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-8 rounded-lg border border-dashed border-accent/40 bg-accent/5 p-5 text-sm">
              <span className="font-semibold">No beef listed yet.</span> Here are
              example products so you can see how the storefront works.{" "}
              <Link href="/signup" className="font-medium text-primary underline">
                List yours.
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {demoBeefBoxes.map((b) => (
                <BeefBoxCard key={b.id} box={b} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
