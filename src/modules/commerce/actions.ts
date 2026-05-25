"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { getStripe, stripeConfigured } from "@/lib/stripe/client";
import { publicEnv } from "@/lib/env";
import { enforce } from "@/lib/ratelimit";
import {
  parseCart,
  serializeCart,
  addItem,
  setQuantity,
  removeItem,
  type Cart,
} from "@/modules/commerce/cart";

const CART_COOKIE = "or_cart";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

async function readCart(): Promise<Cart> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}
async function writeCart(cart: Cart) {
  (await cookies()).set(CART_COOKIE, serializeCart(cart), COOKIE_OPTS);
}

export async function addToCartAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const qty = Math.max(1, Number(formData.get("quantity") ?? 1) || 1);
  if (!productId) return;
  await writeCart(addItem(await readCart(), productId, qty));
  redirect("/cart");
}

export async function updateCartItemAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const qty = Number(formData.get("quantity") ?? 0) || 0;
  if (!productId) return;
  await writeCart(setQuantity(await readCart(), productId, qty));
  revalidatePath("/cart");
}

export async function removeFromCartAction(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  if (!productId) return;
  await writeCart(removeItem(await readCart(), productId));
  revalidatePath("/cart");
}

const checkoutItemsSchema = z.array(
  z.object({ product_id: z.string().uuid(), quantity: z.number().int().positive() }),
);

export type CheckoutState = { error?: string };

const ORDER_ERRORS: Record<string, string> = {
  EMPTY_CART: "Your cart is empty.",
  PRODUCT_NOT_FOUND: "One of these products is no longer available.",
  PRODUCT_UNAVAILABLE: "One of these products is no longer for sale.",
  PRICE_NOT_SET: "This product isn't priced for online sale.",
  MULTIPLE_SELLERS: "Please check out one seller at a time.",
};
function orderError(raw: string): string {
  if (raw.startsWith("INSUFFICIENT_INVENTORY")) {
    const name = raw.split(":")[1];
    return name ? `Sorry — "${name}" doesn't have enough stock left.` : "Not enough stock.";
  }
  for (const k of Object.keys(ORDER_ERRORS)) if (raw.includes(k)) return ORDER_ERRORS[k];
  return "We couldn't start checkout. Please try again.";
}

/**
 * Create a pending_payment order (reserving inventory atomically) for one
 * seller's items, then hand off to Stripe Checkout. The order total is computed
 * server-side from DB prices — the client never sends amounts.
 */
export async function startCheckoutAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const user = await requireUser();

  const gate = await enforce([{ name: "checkout", identifier: user.id }], { failOpen: true });
  if (!gate.allowed) return { error: "Too many checkout attempts — try again shortly." };

  let items;
  try {
    items = checkoutItemsSchema.parse(JSON.parse(String(formData.get("items") ?? "[]")));
  } catch {
    return { error: "Your cart could not be read. Please refresh and try again." };
  }
  if (items.length === 0) return { error: "Your cart is empty." };

  const supabase = await createClient();
  const { data: order, error } = await supabase.rpc("place_order", { p_items: items });
  if (error || !order) return { error: orderError(error?.message ?? "") };

  // Remove the purchased items from the cart cookie.
  let cart = await readCart();
  for (const it of items) cart = removeItem(cart, it.product_id);
  await writeCart(cart);

  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;

  // No Stripe configured → order stands as pending_payment (honest: no fake charge).
  if (!stripeConfigured()) {
    redirect(`/orders/${order.order_id}`);
  }

  let url: string | null = null;
  try {
    const { data: lineRows } = await supabase
      .from("order_items")
      .select("name, unit_price_usd, quantity")
      .eq("order_id", order.order_id);

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: (lineRows ?? []).map((li) => ({
        quantity: li.quantity,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(Number(li.unit_price_usd) * 100),
          product_data: { name: li.name },
        },
      })),
      metadata: { order_id: order.order_id },
      customer_email: user.email ?? undefined,
      success_url: `${appUrl}/orders/${order.order_id}?paid=1`,
      cancel_url: `${appUrl}/orders/${order.order_id}?canceled=1`,
    });
    url = session.url;
  } catch {
    return { error: "Payment could not be started. Your order is saved as pending." };
  }

  if (!url) redirect(`/orders/${order.order_id}`);
  redirect(url);
}

/** Buyer or seller-admin cancels an unpaid order. */
export async function cancelOrderAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("orderId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.rpc("cancel_order", { p_order: id });
  revalidatePath(`/orders/${id}`);
  revalidatePath("/dashboard/orders");
}

/** Seller marks a paid order fulfilled. */
export async function fulfillOrderAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("orderId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.rpc("fulfill_order", { p_order: id });
  revalidatePath(`/dashboard/orders/${id}`);
  revalidatePath("/dashboard/orders");
}

/** Seller refunds a paid/fulfilled order (records state; Stripe refund TODO). */
export async function refundOrderAction(formData: FormData) {
  await requireUser();
  const id = String(formData.get("orderId") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.rpc("refund_order", { p_order: id });
  // Best-effort Stripe refund when configured + we have a payment intent.
  if (stripeConfigured()) {
    const { data: order } = await supabase
      .from("orders")
      .select("stripe_payment_intent")
      .eq("id", id)
      .maybeSingle();
    if (order?.stripe_payment_intent) {
      try {
        await getStripe().refunds.create({ payment_intent: order.stripe_payment_intent });
      } catch {
        // State is recorded as refunded; surface reconciliation in admin later.
      }
    }
  }
  revalidatePath(`/dashboard/orders/${id}`);
  revalidatePath("/dashboard/orders");
}
