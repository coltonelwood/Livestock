import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/stripe/webhook/route";

type RouteRequest = Parameters<typeof POST>[0];

function makeRequest(
  body: string,
  headers: Record<string, string>,
): RouteRequest {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers,
  }) as unknown as RouteRequest;
}

describe("Stripe webhook signature verification", () => {
  const original = { ...process.env };
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy";
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it("returns 500 when the webhook secret is not configured", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(
      makeRequest("{}", { "stripe-signature": "whatever" }),
    );
    expect(res.status).toBe(500);
  });

  it("returns 400 when the signature header is missing", async () => {
    const res = await POST(makeRequest("{}", {}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when the signature is invalid (rejected, not processed)", async () => {
    const res = await POST(
      makeRequest('{"id":"evt_1","type":"customer.subscription.updated"}', {
        "stripe-signature": "t=1,v1=deadbeef",
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBeDefined();
  });
});
