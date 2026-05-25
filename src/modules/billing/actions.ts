"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, stripeConfigured } from "@/lib/stripe/client";
import { getProfile } from "@/lib/auth/session";
import { requireOrg, isOrgAdmin } from "@/modules/organizations/context";
import { publicEnv } from "@/lib/env";
import {
  PURCHASABLE_PLANS,
  priceIdForPlan,
  type PlanId,
} from "@/modules/billing/plans";

export type BillingActionState = { error?: string };

/** Ensure the org has a Stripe customer; returns its id. Uses the admin client
 * (billing rows are written only by trusted server code / webhooks). */
async function ensureCustomer(
  organizationId: string,
  organizationName: string,
  email: string | null,
): Promise<string> {
  const admin = createAdminClient();
  const existing = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (existing.data?.stripe_customer_id) return existing.data.stripe_customer_id;

  const customer = await getStripe().customers.create({
    name: organizationName,
    email: email ?? undefined,
    metadata: { organization_id: organizationId },
  });

  await admin
    .from("subscriptions")
    .upsert(
      { organization_id: organizationId, stripe_customer_id: customer.id },
      { onConflict: "organization_id" },
    );

  return customer.id;
}

export async function createCheckoutAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const { organization, role } = await requireOrg();
  if (!isOrgAdmin(role)) return { error: "Only owners and admins can manage billing." };
  if (!stripeConfigured()) return { error: "Billing is not enabled yet." };

  const plan = String(formData.get("plan") ?? "") as PlanId;
  if (!PURCHASABLE_PLANS.includes(plan)) return { error: "Unknown plan." };

  const priceId = priceIdForPlan(plan);
  if (!priceId) return { error: "This plan is not available right now." };

  const profile = await getProfile();
  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;

  let url: string | null = null;
  try {
    const customerId = await ensureCustomer(
      organization.id,
      organization.name,
      profile?.email ?? null,
    );
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: organization.id,
      subscription_data: { metadata: { organization_id: organization.id } },
      success_url: `${appUrl}/dashboard/billing?checkout=success`,
      cancel_url: `${appUrl}/dashboard/billing?checkout=cancelled`,
    });
    url = session.url;

    await createAdminClient().from("audit_logs").insert({
      organization_id: organization.id,
      action: "billing.checkout_started",
      entity_type: "subscription",
      metadata: { plan },
    });
  } catch {
    return { error: "Could not start checkout. Please try again." };
  }

  if (!url) return { error: "Could not start checkout. Please try again." };
  redirect(url);
}

export async function createPortalAction(
  _prev: BillingActionState,
  _formData: FormData,
): Promise<BillingActionState> {
  const { organization, role } = await requireOrg();
  if (!isOrgAdmin(role)) return { error: "Only owners and admins can manage billing." };
  if (!stripeConfigured()) return { error: "Billing is not enabled yet." };

  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (!data?.stripe_customer_id) {
    return { error: "No billing account yet — choose a plan first." };
  }

  const appUrl = publicEnv().NEXT_PUBLIC_APP_URL;
  let url: string | null = null;
  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${appUrl}/dashboard/billing`,
    });
    url = session.url;
  } catch {
    return { error: "Could not open the billing portal. Please try again." };
  }

  redirect(url);
}
