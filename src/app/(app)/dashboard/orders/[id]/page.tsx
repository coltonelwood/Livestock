import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireOrg, isOrgAdmin } from "@/modules/organizations/context";
import { orderStatusBadge } from "@/modules/commerce/status";
import {
  fulfillOrderAction,
  cancelOrderAction,
  refundOrderAction,
} from "@/modules/commerce/actions";

export const metadata: Metadata = { title: "Order" };

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default async function SellerOrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization, role } = await requireOrg();
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  const badge = orderStatusBadge(order.status);
  const admin = isOrgAdmin(role);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All orders
      </Link>

      <PageHeader
        title={`Order #${order.id.slice(0, 8)}`}
        description={order.buyer_email ?? undefined}
        action={<Badge variant={badge.variant}>{badge.label}</Badge>}
      />

      <Card>
        <CardContent className="pt-6">
          <ul className="divide-y divide-border">
            {(items ?? []).map((li) => (
              <li key={li.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{li.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {money(Number(li.unit_price_usd))} × {li.quantity}
                  </p>
                </div>
                <span className="font-medium">{money(Number(li.line_total_usd))}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold">{money(Number(order.total_usd ?? 0))}</span>
          </div>
        </CardContent>
      </Card>

      {admin && (
        <div className="mt-6 flex flex-wrap gap-2">
          {order.status === "paid" && (
            <form action={fulfillOrderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <Button type="submit">Mark fulfilled</Button>
            </form>
          )}
          {order.status === "pending_payment" && (
            <form action={cancelOrderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <Button type="submit" variant="outline">Cancel order</Button>
            </form>
          )}
          {(order.status === "paid" || order.status === "fulfilled") && (
            <form action={refundOrderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <Button type="submit" variant="destructive">Refund</Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
