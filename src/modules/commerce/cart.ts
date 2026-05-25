/**
 * Pure cart logic. The cart lives in a cookie as a list of {productId,
 * quantity}; it carries NO prices — authoritative prices and availability are
 * resolved from the database at checkout (place_order). Keeping this pure makes
 * it fully unit-testable and impossible to tamper with for pricing.
 */

export type CartItem = { productId: string; quantity: number };
export type Cart = { items: CartItem[] };

export const EMPTY_CART: Cart = { items: [] };

const MAX_QTY_PER_ITEM = 99;

export function parseCart(raw: string | undefined | null): Cart {
  if (!raw) return EMPTY_CART;
  try {
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.items)) return EMPTY_CART;
    const items: CartItem[] = [];
    for (const it of data.items) {
      const productId = typeof it?.productId === "string" ? it.productId : null;
      const quantity = Number(it?.quantity);
      if (productId && Number.isInteger(quantity) && quantity > 0) {
        items.push({ productId, quantity: Math.min(quantity, MAX_QTY_PER_ITEM) });
      }
    }
    return { items };
  } catch {
    return EMPTY_CART;
  }
}

export function serializeCart(cart: Cart): string {
  return JSON.stringify({ items: cart.items });
}

export function addItem(cart: Cart, productId: string, qty = 1): Cart {
  if (qty <= 0) return cart;
  const existing = cart.items.find((i) => i.productId === productId);
  if (existing) {
    return setQuantity(cart, productId, existing.quantity + qty);
  }
  return {
    items: [...cart.items, { productId, quantity: Math.min(qty, MAX_QTY_PER_ITEM) }],
  };
}

export function setQuantity(cart: Cart, productId: string, qty: number): Cart {
  if (qty <= 0) return removeItem(cart, productId);
  return {
    items: cart.items.map((i) =>
      i.productId === productId
        ? { ...i, quantity: Math.min(qty, MAX_QTY_PER_ITEM) }
        : i,
    ),
  };
}

export function removeItem(cart: Cart, productId: string): Cart {
  return { items: cart.items.filter((i) => i.productId !== productId) };
}

export function cartCount(cart: Cart): number {
  return cart.items.reduce((n, i) => n + i.quantity, 0);
}
