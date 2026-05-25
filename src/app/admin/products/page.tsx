import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { archiveProductAction } from "@/modules/admin/actions";

export const metadata: Metadata = { title: "Admin · Products" };

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("meat_products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Beef products &amp; moderation</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Archiving removes a product from the public storefront.
      </p>
      <div className="grid gap-2">
        {(products ?? []).map((p) => (
          <Card key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium">{p.name}</p>
              <p className="text-sm text-muted-foreground">
                {p.seller_name} · {p.product_type.replace("_", " ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Badge variant={p.status === "active" ? "success" : "outline"}>{p.status}</Badge>
              {p.status === "active" && (
                <form action={archiveProductAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <Button type="submit" variant="destructive" size="sm">Archive</Button>
                </form>
              )}
            </div>
          </Card>
        ))}
        {(!products || products.length === 0) && (
          <p className="text-sm text-muted-foreground">No products yet.</p>
        )}
      </div>
    </>
  );
}
