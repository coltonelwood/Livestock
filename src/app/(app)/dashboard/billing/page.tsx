import { Check } from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { cn } from "@/lib/utils";
import {
  getOrganizationSubscription,
  canCreateListing,
} from "@/modules/billing/entitlements";
import { PLANS, PURCHASABLE_PLANS } from "@/modules/billing/plans";
import { stripeConfigured } from "@/lib/stripe/client";
import { CheckoutButton } from "@/modules/billing/components/checkout-button";
import { ManageBillingButton } from "@/modules/billing/components/manage-billing-button";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const { subscription, plan, entitlements } = await getOrganizationSubscription();
  const listingUsage = await canCreateListing();
  const configured = stripeConfigured();

  const status = subscription?.status ?? "trialing";
  const hasCustomer = !!subscription?.stripe_customer_id;
  const limitLabel =
    entitlements.maxActiveListings === Infinity
      ? "Unlimited"
      : String(entitlements.maxActiveListings);

  return (
    <>
      <PageHeader title="Billing" description="Manage your plan and payment method." />

      {!configured && (
        <div className="mb-6 rounded-md border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
          Billing is not enabled in this environment. Add your Stripe keys and
          price IDs to take subscriptions. Your organization runs on the free
          tier until then.
        </div>
      )}

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current plan
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-2xl font-bold">{PLANS[plan].name}</span>
            <Badge variant="secondary">{status}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{listingUsage.current}</span>
            <span className="text-muted-foreground"> / {limitLabel}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Renews / ends
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-sm">
              {subscription?.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString()
                : "—"}
            </span>
            {hasCustomer && <ManageBillingButton />}
          </CardContent>
        </Card>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Plans</h2>
      <div className="grid gap-6 lg:grid-cols-3">
        {PURCHASABLE_PLANS.map((planId) => {
          const meta = PLANS[planId];
          const isCurrent = plan === planId;
          return (
            <Card key={planId} className={cn(isCurrent && "border-primary ring-1 ring-primary/20")}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{meta.name}</span>
                  {isCurrent && <Badge>Current</Badge>}
                </CardTitle>
                <p className="text-2xl font-bold">{meta.priceLabel}</p>
                <p className="text-sm text-muted-foreground">{meta.tagline}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {meta.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="size-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  hasCustomer ? (
                    <ManageBillingButton />
                  ) : null
                ) : (
                  <CheckoutButton
                    plan={planId}
                    label={`Choose ${meta.name}`}
                    variant={planId === "pro" ? "default" : "outline"}
                    disabled={!configured}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
