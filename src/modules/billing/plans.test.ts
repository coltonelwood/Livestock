import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  effectivePlan,
  entitlementsFor,
  listingDecision,
  planFromPriceId,
  priceIdForPlan,
  ENTITLEMENTS,
} from "@/modules/billing/plans";

describe("entitlementsFor / effectivePlan", () => {
  it("grants the plan's entitlements when active", () => {
    expect(entitlementsFor("pro", "active")).toEqual(ENTITLEMENTS.pro);
    expect(entitlementsFor("enterprise", "trialing")).toEqual(
      ENTITLEMENTS.enterprise,
    );
  });

  it("downgrades to free when the subscription is not active", () => {
    expect(effectivePlan("pro", "past_due")).toBe("free");
    expect(effectivePlan("enterprise", "canceled")).toBe("free");
    expect(effectivePlan("pro", "incomplete")).toBe("free");
  });

  it("treats a missing subscription as free", () => {
    expect(effectivePlan(null, null)).toBe("free");
    expect(entitlementsFor(null, null)).toEqual(ENTITLEMENTS.free);
  });

  it("blocks gated features for an inactive paid subscription", () => {
    const ent = entitlementsFor("pro", "canceled");
    expect(ent.advancedAI).toBe(false);
    expect(ent.auctions).toBe(false);
    expect(ent.maxActiveListings).toBe(5);
  });

  it("enterprise unlocks auctions; pro does not", () => {
    expect(entitlementsFor("enterprise", "active").auctions).toBe(true);
    expect(entitlementsFor("pro", "active").auctions).toBe(false);
  });
});

describe("listingDecision", () => {
  it("allows under the limit and blocks at the limit (Starter = 5)", () => {
    const ent = entitlementsFor("starter", "active");
    expect(listingDecision(ent, 4).allowed).toBe(true);
    expect(listingDecision(ent, 5).allowed).toBe(false);
    expect(listingDecision(ent, 5).limit).toBe(5);
  });

  it("never blocks unlimited plans", () => {
    const ent = entitlementsFor("pro", "active");
    expect(listingDecision(ent, 9999).allowed).toBe(true);
  });
});

describe("price ID mapping", () => {
  const original = { ...process.env };
  beforeEach(() => {
    process.env.STRIPE_STARTER_PRICE_ID = "price_starter";
    process.env.STRIPE_PRO_PRICE_ID = "price_pro";
    process.env.STRIPE_ENTERPRISE_PRICE_ID = "price_ent";
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it("resolves a plan's configured price ID", () => {
    expect(priceIdForPlan("starter")).toBe("price_starter");
    expect(priceIdForPlan("free")).toBeNull();
  });

  it("maps a price ID back to its plan", () => {
    expect(planFromPriceId("price_pro")).toBe("pro");
    expect(planFromPriceId("price_ent")).toBe("enterprise");
  });

  it("maps unknown or missing price IDs to free", () => {
    expect(planFromPriceId("price_unknown")).toBe("free");
    expect(planFromPriceId(null)).toBe("free");
  });
});
