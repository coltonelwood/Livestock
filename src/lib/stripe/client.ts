import "server-only";

import Stripe from "stripe";

/**
 * Lazily-constructed Stripe client. Configuration is optional so the app builds
 * and runs in preview without billing; callers must handle the "not configured"
 * case (billing actions surface a friendly error; the webhook returns 400/500).
 */

let cached: Stripe | null | undefined;

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing).");
  }
  // apiVersion omitted → uses the SDK's pinned default for this Stripe version.
  cached = new Stripe(key);
  return cached;
}

export function getStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null;
}
