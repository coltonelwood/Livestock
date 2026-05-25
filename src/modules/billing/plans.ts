import type { SubscriptionStatus } from "@/lib/db/types";

/**
 * Plan tiers and entitlements. This module is pure (no Stripe / env access at
 * import) so it is safe to use in client components for display AND in
 * server-side entitlement checks. Price-ID resolution reads env lazily inside
 * functions, on the server only.
 */

export type PlanId = "free" | "starter" | "pro" | "enterprise";

export type Entitlements = {
  /** Max ACTIVE livestock listings; Infinity = unlimited. */
  maxActiveListings: number;
  /** Advanced AI receptionist (custom qualification script + extra prompt). */
  advancedAI: boolean;
  /** Online auctions + live bidding. */
  auctions: boolean;
  /** Public marketplace storefront / DTC product listings. */
  storefront: boolean;
  /** Team members beyond the owner. */
  teamMembers: boolean;
};

export const ENTITLEMENTS: Record<PlanId, Entitlements> = {
  free: {
    maxActiveListings: 5,
    advancedAI: false,
    auctions: false,
    storefront: false,
    teamMembers: false,
  },
  starter: {
    maxActiveListings: 5,
    advancedAI: false,
    auctions: false,
    storefront: false,
    teamMembers: false,
  },
  pro: {
    maxActiveListings: Infinity,
    advancedAI: true,
    auctions: false,
    storefront: true,
    teamMembers: false,
  },
  enterprise: {
    maxActiveListings: Infinity,
    advancedAI: true,
    auctions: true,
    storefront: true,
    teamMembers: true,
  },
};

export type PlanMeta = {
  id: PlanId;
  name: string;
  priceUsd: number;
  priceLabel: string;
  tagline: string;
  features: string[];
  /** Plans a customer can subscribe to via Checkout (free is the default). */
  purchasable: boolean;
};

export const PLANS: Record<PlanId, PlanMeta> = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    priceLabel: "$0",
    tagline: "Get started and explore.",
    features: ["Up to 5 active listings", "AI receptionist (basic)", "CRM basics"],
    purchasable: false,
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceUsd: 99,
    priceLabel: "$99/mo",
    tagline: "For getting organized and capturing leads.",
    features: [
      "AI receptionist web chat",
      "CRM basics",
      "5 active listings",
      "Basic ranch profile",
    ],
    purchasable: true,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: 299,
    priceLabel: "$299/mo",
    tagline: "For working operations selling regularly.",
    features: [
      "Everything in Starter",
      "Unlimited listings",
      "AI lead qualification",
      "Marketplace storefront",
      "Direct-to-consumer product listings",
      "Advanced CRM",
    ],
    purchasable: true,
  },
  enterprise: {
    id: "enterprise",
    name: "Auction House / Enterprise",
    priceUsd: 999,
    priceLabel: "from $999/mo",
    tagline: "For sale barns and multi-location operations.",
    features: [
      "Everything in Pro",
      "Online auctions & live bidding",
      "Team members",
      "Priority support",
      "Custom onboarding",
    ],
    purchasable: true,
  },
};

export const PURCHASABLE_PLANS: PlanId[] = ["starter", "pro", "enterprise"];

/** Env var name holding the Stripe price ID for a purchasable plan. */
const PRICE_ENV: Record<Exclude<PlanId, "free">, string> = {
  starter: "STRIPE_STARTER_PRICE_ID",
  pro: "STRIPE_PRO_PRICE_ID",
  enterprise: "STRIPE_ENTERPRISE_PRICE_ID",
};

/** Server-only: the configured Stripe price ID for a plan, or null. */
export function priceIdForPlan(plan: PlanId): string | null {
  if (plan === "free") return null;
  return process.env[PRICE_ENV[plan]] ?? null;
}

/** Server-only: map a Stripe price ID back to a plan tier. */
export function planFromPriceId(priceId: string | null | undefined): PlanId {
  if (!priceId) return "free";
  for (const plan of PURCHASABLE_PLANS) {
    if (priceIdForPlan(plan) === priceId) return plan;
  }
  return "free";
}

const ACTIVE_STATUSES: SubscriptionStatus[] = ["active", "trialing"];

/**
 * The plan a subscription effectively grants. A non-active subscription
 * (past_due, canceled, incomplete) is downgraded to `free` so gated features
 * are blocked the moment billing lapses.
 */
export function effectivePlan(
  plan: string | null | undefined,
  status: SubscriptionStatus | null | undefined,
): PlanId {
  const isActive = !!status && ACTIVE_STATUSES.includes(status);
  if (!isActive) return "free";
  if (plan === "starter" || plan === "pro" || plan === "enterprise") return plan;
  return "free";
}

/** Entitlements for an (optionally inactive) subscription. */
export function entitlementsFor(
  plan: string | null | undefined,
  status: SubscriptionStatus | null | undefined,
): Entitlements {
  return ENTITLEMENTS[effectivePlan(plan, status)];
}

export type ListingDecision = {
  allowed: boolean;
  limit: number;
  current: number;
};

/** Pure decision: may another ACTIVE listing be created given the count? */
export function listingDecision(
  entitlements: Entitlements,
  activeCount: number,
): ListingDecision {
  return {
    allowed: activeCount < entitlements.maxActiveListings,
    limit: entitlements.maxActiveListings,
    current: activeCount,
  };
}
