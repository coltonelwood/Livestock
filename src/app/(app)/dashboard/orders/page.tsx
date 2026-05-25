import Link from "next/link";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { EmptyState } from "@/modules/dashboard/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";
import { orderStatusBadge } from "@/modules/commerce/status";

export const metadata: Metadata = { title: "Orders" };

export default async function SellerOrdersPage() {
  const { organization } = await requireOrg();
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Orders" description="Direct-to-consumer beef orders for your operation." />

      {!orders || orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="When customers buy your beef products, their orders show up here for you to fulfill."
        />
      ) : (
        <div className="grid gap-3">
          {orders.map((o) => {
            const badge = orderStatusBadge(o.status);
            return (
              <Link key={o.id} href={`/dashboard/orders/${o.id}`}>
                <Card className="flex items-center justify-between p-4 transition-colors hover:border-primary/40">
                  <div>
                    <p className="font-medium">Order #{o.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()} ·{" "}
                      ${Number(o.total_usd ?? 0).toLocaleString()} · {o.buyer_email ?? "—"}
                    </p>
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
