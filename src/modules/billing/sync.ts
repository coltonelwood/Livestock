import type { SubscriptionStatus } from "@/lib/db/types";
import { planFromPriceId, type PlanId } from "@/modules/billing/plans";

/** Structural shape of the bits of a Stripe Subscription we consume. */
export type StripeSubscriptionLike = {
  id: string;
  status: string;
  current_period_end: number | null;
  items: { data: Array<{ price: { id: string } | null }> };
};

/** Map Stripe's subscription.status to our enum. */
export function mapStripeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
      return "canceled";
    case "incomplete":
    case "incomplete_expired":
    default:
      return "incomplete";
  }
}

export type SubscriptionRowFields = {
  stripe_subscription_id: string;
  price_id: string | null;
  plan: PlanId;
  status: SubscriptionStatus;
  current_period_end: string | null;
};

/** Derive our subscription row fields from a Stripe subscription object. */
export function subscriptionRowFromStripe(
  sub: StripeSubscriptionLike,
): SubscriptionRowFields {
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const status = mapStripeStatus(sub.status);
  return {
    stripe_subscription_id: sub.id,
    price_id: priceId,
    plan: planFromPriceId(priceId),
    status,
    current_period_end:
      sub.current_period_end != null
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
  };
}
