import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  mapStripeStatus,
  subscriptionRowFromStripe,
  type StripeSubscriptionLike,
} from "@/modules/billing/sync";

describe("mapStripeStatus", () => {
  it("maps Stripe statuses to our enum", () => {
    expect(mapStripeStatus("active")).toBe("active");
    expect(mapStripeStatus("trialing")).toBe("trialing");
    expect(mapStripeStatus("past_due")).toBe("past_due");
    expect(mapStripeStatus("unpaid")).toBe("past_due");
    expect(mapStripeStatus("canceled")).toBe("canceled");
    expect(mapStripeStatus("incomplete")).toBe("incomplete");
    expect(mapStripeStatus("incomplete_expired")).toBe("incomplete");
    expect(mapStripeStatus("something_new")).toBe("incomplete");
  });
});

describe("subscriptionRowFromStripe", () => {
  const original = { ...process.env };
  beforeEach(() => {
    process.env.STRIPE_PRO_PRICE_ID = "price_pro";
  });
  afterEach(() => {
    process.env = { ...original };
  });

  const sub: StripeSubscriptionLike = {
    id: "sub_123",
    status: "active",
    current_period_end: 1_900_000_000,
    items: { data: [{ price: { id: "price_pro" } }] },
  };

  it("derives row fields including the plan from the price", () => {
    const row = subscriptionRowFromStripe(sub);
    expect(row.stripe_subscription_id).toBe("sub_123");
    expect(row.price_id).toBe("price_pro");
    expect(row.plan).toBe("pro");
    expect(row.status).toBe("active");
    expect(row.current_period_end).toBe(
      new Date(1_900_000_000 * 1000).toISOString(),
    );
  });

  it("handles a missing period end and unknown price", () => {
    const row = subscriptionRowFromStripe({
      id: "sub_x",
      status: "canceled",
      current_period_end: null,
      items: { data: [{ price: { id: "price_other" } }] },
    });
    expect(row.current_period_end).toBeNull();
    expect(row.plan).toBe("free");
    expect(row.status).toBe("canceled");
  });
});
