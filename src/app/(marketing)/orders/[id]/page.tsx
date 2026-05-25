import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { orderStatusBadge } from "@/modules/commerce/status";
import { cancelOrderAction } from "@/modules/commerce/actions";
import { stripeConfigured } from "@/lib/stripe/client";

export const metadata: Metadata = { title: "Order" };
export const dynamic = "force-dynamic";

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string; canceled?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  await requireUser();
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: true });

  const badge = orderStatusBadge(order.status);
  const awaitingPayment = order.status === "pending_payment";

  return (
    <div className="container max-w-2xl py-12">
      <Link
        href="/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Your orders
      </Link>

      {sp.paid && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="size-4" /> Payment received — thank you! The seller will be in touch.
        </div>
      )}
      {sp.canceled && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Checkout was canceled. This order is still awaiting payment.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Order #{order.id.slice(0, 8)}
        </h1>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Placed {new Date(order.created_at).toLocaleString()}
      </p>

      <Card className="mt-6">
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

      {awaitingPayment && (
        <div className="mt-6 space-y-3">
          {!stripeConfigured() && (
            <p className="rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
              Online payment isn&apos;t enabled in this environment, so this order
              is held as awaiting payment. The seller can arrange payment directly.
            </p>
          )}
          <form action={cancelOrderAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <Button type="submit" variant="outline">Cancel order</Button>
          </form>
        </div>
      )}
    </div>
  );
}
