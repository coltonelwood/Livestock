import Link from "next/link";
import { Package } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { orderStatusBadge } from "@/modules/commerce/status";

export const metadata: Metadata = { title: "Your orders" };
export const dynamic = "force-dynamic";

export default async function BuyerOrdersPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="container max-w-3xl py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">Your orders</h1>

      {!orders || orders.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Package className="size-8 text-muted-foreground" />
            <p className="font-semibold">No orders yet</p>
            <Button asChild>
              <Link href="/beef">Browse beef</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-3">
          {orders.map((o) => {
            const badge = orderStatusBadge(o.status);
            return (
              <Link key={o.id} href={`/orders/${o.id}`}>
                <Card className="flex items-center justify-between p-4 transition-colors hover:border-primary/40">
                  <div>
                    <p className="font-medium">Order #{o.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()} ·{" "}
                      ${Number(o.total_usd ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
