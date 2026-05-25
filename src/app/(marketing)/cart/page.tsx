import Link from "next/link";
import { cookies } from "next/headers";
import { ShoppingCart } from "lucide-react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { parseCart } from "@/modules/commerce/cart";
import {
  updateCartItemAction,
  removeFromCartAction,
} from "@/modules/commerce/actions";
import { CheckoutForm } from "@/modules/commerce/components/checkout-form";
import type { MeatProduct } from "@/lib/db/types";

export const metadata: Metadata = { title: "Your cart" };
export const dynamic = "force-dynamic";

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

export default async function CartPage() {
  const cart = parseCart((await cookies()).get("or_cart")?.value);

  let products: MeatProduct[] = [];
  if (cart.items.length > 0) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("meat_products")
        .select("*")
        .in("id", cart.items.map((i) => i.productId));
      products = data ?? [];
    } catch {
      products = [];
    }
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = cart.items
    .map((i) => ({ item: i, product: byId.get(i.productId) }))
    .filter((l): l is { item: typeof l.item; product: MeatProduct } => !!l.product);

  // Group by seller — checkout happens one seller at a time.
  const groups = new Map<string, { seller: string; lines: typeof lines }>();
  for (const l of lines) {
    const key = l.product.organization_id;
    const g = groups.get(key) ?? { seller: l.product.seller_name ?? "Seller", lines: [] };
    g.lines.push(l);
    groups.set(key, g);
  }

  return (
    <div className="container max-w-3xl py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">Your cart</h1>

      {lines.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <ShoppingCart className="size-8 text-muted-foreground" />
            <div>
              <p className="font-semibold">Your cart is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Find quarters, halves, and cuts from ranches selling direct.
              </p>
            </div>
            <Button asChild>
              <Link href="/beef">Browse beef</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 space-y-6">
          {[...groups.entries()].map(([orgId, group]) => {
            const subtotal = group.lines.reduce(
              (s, l) => s + Number(l.product.price_usd ?? 0) * l.item.quantity,
              0,
            );
            return (
              <Card key={orgId}>
                <CardContent className="space-y-4 pt-6">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Sold by {group.seller}
                  </p>
                  <ul className="divide-y divide-border">
                    {group.lines.map(({ item, product }) => {
                      const soldOut = product.inventory != null && product.inventory <= 0;
                      const lowStock =
                        product.inventory != null && product.inventory > 0 && product.inventory < item.quantity;
                      return (
                        <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {money(Number(product.price_usd ?? 0))} / {product.unit}
                              {soldOut && <span className="ml-2 text-destructive">Sold out</span>}
                              {lowStock && (
                                <span className="ml-2 text-amber-600">
                                  only {product.inventory} left
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <form action={updateCartItemAction} className="flex items-center gap-1">
                              <input type="hidden" name="productId" value={product.id} />
                              <Input
                                name="quantity"
                                type="number"
                                min="1"
                                defaultValue={item.quantity}
                                className="h-9 w-16"
                                aria-label={`Quantity of ${product.name}`}
                              />
                              <Button type="submit" size="sm" variant="outline">Update</Button>
                            </form>
                            <form action={removeFromCartAction}>
                              <input type="hidden" name="productId" value={product.id} />
                              <Button type="submit" size="sm" variant="ghost">Remove</Button>
                            </form>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="font-semibold">Subtotal</span>
                    <span className="font-bold">{money(subtotal)}</span>
                  </div>
                  <CheckoutForm
                    items={group.lines.map((l) => ({ product_id: l.product.id, quantity: l.item.quantity }))}
                    label={`Check out · ${money(subtotal)}`}
                  />
                </CardContent>
              </Card>
            );
          })}
          <p className="text-center text-xs text-muted-foreground">
            You&apos;ll be asked to log in at checkout. Payment is processed securely by Stripe.
          </p>
        </div>
      )}
    </div>
  );
}
