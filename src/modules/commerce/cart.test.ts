import { describe, expect, it } from "vitest";

import {
  EMPTY_CART,
  parseCart,
  serializeCart,
  addItem,
  setQuantity,
  removeItem,
  cartCount,
} from "@/modules/commerce/cart";

describe("cart — add / update / remove", () => {
  it("adds a new item", () => {
    const cart = addItem(EMPTY_CART, "p1", 2);
    expect(cart.items).toEqual([{ productId: "p1", quantity: 2 }]);
  });

  it("merges quantity when adding an existing item", () => {
    const cart = addItem(addItem(EMPTY_CART, "p1", 2), "p1", 3);
    expect(cart.items).toEqual([{ productId: "p1", quantity: 5 }]);
  });

  it("updates quantity", () => {
    const cart = setQuantity(addItem(EMPTY_CART, "p1", 2), "p1", 7);
    expect(cart.items[0].quantity).toBe(7);
  });

  it("removes an item when quantity drops to zero or below", () => {
    expect(setQuantity(addItem(EMPTY_CART, "p1", 2), "p1", 0).items).toEqual([]);
    expect(removeItem(addItem(EMPTY_CART, "p1", 2), "p1").items).toEqual([]);
  });

  it("caps quantity to prevent abuse", () => {
    expect(addItem(EMPTY_CART, "p1", 9999).items[0].quantity).toBe(99);
  });

  it("counts total units", () => {
    const cart = addItem(addItem(EMPTY_CART, "p1", 2), "p2", 3);
    expect(cartCount(cart)).toBe(5);
  });
});

describe("cart — serialization safety", () => {
  it("round-trips", () => {
    const cart = addItem(EMPTY_CART, "p1", 2);
    expect(parseCart(serializeCart(cart))).toEqual(cart);
  });

  it("returns an empty cart for garbage / missing input", () => {
    expect(parseCart(undefined)).toEqual(EMPTY_CART);
    expect(parseCart("not json")).toEqual(EMPTY_CART);
    expect(parseCart('{"items":"nope"}')).toEqual(EMPTY_CART);
  });

  it("drops malformed items (no price/qty tampering survives)", () => {
    const parsed = parseCart(
      JSON.stringify({ items: [{ productId: "p1", quantity: 2, price: 0.01 }, { quantity: 5 }, { productId: "p2", quantity: -1 }] }),
    );
    expect(parsed.items).toEqual([{ productId: "p1", quantity: 2 }]);
  });
});
