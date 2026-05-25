import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";
import type { Database, Subscription } from "@/lib/db/types";
import {
  effectivePlan,
  entitlementsFor,
  listingDecision,
  type Entitlements,
  type ListingDecision,
  type PlanId,
} from "@/modules/billing/plans";

type Db = SupabaseClient<Database>;

/** Fetch the subscription row for an org using any Supabase client. */
export async function fetchSubscriptionRow(
  client: Db,
  organizationId: string,
): Promise<Subscription | null> {
  const { data } = await client
    .from("subscriptions")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data ?? null;
}

/** Entitlements for an org, given any client (used by public/admin contexts). */
export async function entitlementsForOrg(
  client: Db,
  organizationId: string,
): Promise<Entitlements> {
  const sub = await fetchSubscriptionRow(client, organizationId);
  return entitlementsFor(sub?.plan ?? null, sub?.status ?? null);
}

export type OrgSubscription = {
  organizationId: string;
  subscription: Subscription | null;
  plan: PlanId;
  entitlements: Entitlements;
};

/** The current org's subscription, effective plan, and entitlements. */
export async function getOrganizationSubscription(): Promise<OrgSubscription> {
  const { organization } = await requireOrg();
  const supabase = await createClient();
  const subscription = await fetchSubscriptionRow(supabase, organization.id);
  const plan = effectivePlan(subscription?.plan ?? null, subscription?.status ?? null);
  return {
    organizationId: organization.id,
    subscription,
    plan,
    entitlements: entitlementsFor(subscription?.plan ?? null, subscription?.status ?? null),
  };
}

/** Entitlements for the current org. */
export async function getEntitlements(): Promise<Entitlements> {
  return (await getOrganizationSubscription()).entitlements;
}

/**
 * Require an active paid subscription; redirect to billing otherwise. Use to
 * gate premium-only pages. (Core CRM/listings remain usable on the free tier.)
 */
export async function requireActiveSubscription(): Promise<OrgSubscription> {
  const ctx = await getOrganizationSubscription();
  if (ctx.plan === "free") redirect("/dashboard/billing");
  return ctx;
}

/** Can the current org create another ACTIVE livestock listing? */
export async function canCreateListing(): Promise<ListingDecision> {
  const { organization } = await requireOrg();
  const supabase = await createClient();
  const subscription = await fetchSubscriptionRow(supabase, organization.id);
  const entitlements = entitlementsFor(
    subscription?.plan ?? null,
    subscription?.status ?? null,
  );
  const { count } = await supabase
    .from("livestock_listings")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id)
    .eq("status", "active");
  return listingDecision(entitlements, count ?? 0);
}

export async function canAccessAuctionTools(): Promise<boolean> {
  return (await getEntitlements()).auctions;
}

export async function canUseAdvancedAI(): Promise<boolean> {
  return (await getEntitlements()).advancedAI;
}
