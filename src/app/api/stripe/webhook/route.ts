import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { getStripe, getStripeWebhookSecret } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  subscriptionRowFromStripe,
  type StripeSubscriptionLike,
} from "@/modules/billing/sync";

export const runtime = "nodejs";

type Admin = ReturnType<typeof createAdminClient>;

async function orgIdForCustomer(
  admin: Admin,
  customerId: string | null,
): Promise<string | null> {
  if (!customerId) return null;
  const { data } = await admin
    .from("subscriptions")
    .select("organization_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.organization_id ?? null;
}

async function audit(
  admin: Admin,
  organizationId: string | null,
  action: string,
  metadata: Record<string, unknown>,
) {
  await admin.from("audit_logs").insert({
    organization_id: organizationId,
    action,
    entity_type: "subscription",
    metadata,
  });
}

async function upsertFromSubscription(
  admin: Admin,
  organizationId: string,
  sub: StripeSubscriptionLike,
  customerId: string | null,
) {
  const fields = subscriptionRowFromStripe(sub);
  await admin.from("subscriptions").upsert(
    {
      organization_id: organizationId,
      ...(customerId ? { stripe_customer_id: customerId } : {}),
      ...fields,
    },
    { onConflict: "organization_id" },
  );
}

export async function POST(request: NextRequest) {
  const secret = getStripeWebhookSecret();
  if (!secret) {
    // Misconfiguration — do not silently accept unverifiable events.
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    // Signature verification failed — reject.
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId =
          session.client_reference_id ??
          (session.metadata?.organization_id ?? null);
        const customerId =
          typeof session.customer === "string" ? session.customer : null;
        if (organizationId && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const sub = await getStripe().subscriptions.retrieve(subId);
          await upsertFromSubscription(
            admin,
            organizationId,
            sub as unknown as StripeSubscriptionLike,
            customerId,
          );
        }
        await audit(admin, organizationId, `billing.${event.type}`, {
          session_id: session.id,
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const organizationId =
          sub.metadata?.organization_id ??
          (await orgIdForCustomer(admin, customerId));
        if (organizationId) {
          await upsertFromSubscription(
            admin,
            organizationId,
            sub as unknown as StripeSubscriptionLike,
            customerId,
          );
        }
        await audit(admin, organizationId, `billing.${event.type}`, {
          subscription_id: sub.id,
          status: sub.status,
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : null;
        const organizationId = await orgIdForCustomer(admin, customerId);
        if (organizationId) {
          await admin
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("organization_id", organizationId);
        }
        await audit(admin, organizationId, `billing.${event.type}`, {
          invoice_id: invoice.id,
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : null;
        const organizationId = await orgIdForCustomer(admin, customerId);
        await audit(admin, organizationId, `billing.${event.type}`, {
          invoice_id: invoice.id,
        });
        break;
      }

      default:
        // Unhandled event types are acknowledged but not processed.
        break;
    }
  } catch {
    // Returning 500 makes Stripe retry the event.
    return NextResponse.json({ error: "Processing error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
