import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { getStripe, getStripeWebhookSecret } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  subscriptionRowFromStripe,
  type StripeSubscriptionLike,
} from "@/modules/billing/sync";
import {
  runIdempotent,
  type WebhookEventStore,
} from "@/modules/billing/idempotency";
import { enqueueNotification } from "@/lib/notifications/enqueue";
import type { StripeEventStatus } from "@/lib/db/types";

export const runtime = "nodejs";

type Admin = ReturnType<typeof createAdminClient>;

/** Supabase-backed idempotency ledger keyed by Stripe event id. */
function createEventStore(admin: Admin): WebhookEventStore {
  return {
    async claimNew(id, type) {
      // INSERT ... ON CONFLICT DO NOTHING RETURNING: only the first caller for a
      // given event id inserts a row; concurrent callers get nothing back.
      const { data, error } = await admin
        .from("stripe_events")
        .upsert(
          { id, type, status: "processing" },
          { onConflict: "id", ignoreDuplicates: true },
        )
        .select("id");
      if (error) throw new Error(`stripe_events claim failed: ${error.message}`);
      return (data?.length ?? 0) > 0;
    },
    async claimRetry(id, staleBefore) {
      // Conditional UPDATE ... RETURNING. A row is either `failed` or
      // `processing` (never both), so at most one branch matches. Postgres row
      // locking guarantees only one concurrent UPDATE flips it.
      const now = new Date().toISOString();
      const failed = await admin
        .from("stripe_events")
        .update({ status: "processing", error: null, claimed_at: now })
        .eq("id", id)
        .eq("status", "failed")
        .select("id");
      if (failed.error)
        throw new Error(`stripe_events retry failed: ${failed.error.message}`);
      if ((failed.data?.length ?? 0) > 0) return true;

      const stale = await admin
        .from("stripe_events")
        .update({ status: "processing", error: null, claimed_at: now })
        .eq("id", id)
        .eq("status", "processing")
        .lt("claimed_at", staleBefore)
        .select("id");
      if (stale.error)
        throw new Error(`stripe_events retry failed: ${stale.error.message}`);
      return (stale.data?.length ?? 0) > 0;
    },
    async getStatus(id) {
      const { data } = await admin
        .from("stripe_events")
        .select("status")
        .eq("id", id)
        .maybeSingle();
      return (data?.status as StripeEventStatus | undefined) ?? null;
    },
    async markProcessed(id, organizationId) {
      await admin
        .from("stripe_events")
        .update({
          status: "processed",
          processed_at: new Date().toISOString(),
          organization_id: organizationId,
        })
        .eq("id", id);
    },
    async markFailed(id, organizationId, error) {
      await admin
        .from("stripe_events")
        .update({ status: "failed", error, organization_id: organizationId })
        .eq("id", id);
    },
  };
}

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

async function notifyOrderPaid(admin: Admin, orderId: string) {
  const { data: order } = await admin
    .from("orders")
    .select("organization_id, buyer_email, total_usd")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;
  const { data: profile } = await admin
    .from("ranch_profiles")
    .select("display_name, email")
    .eq("organization_id", order.organization_id)
    .maybeSingle();
  const business = profile?.display_name ?? undefined;
  await enqueueNotification({
    type: "order_confirmation",
    to: order.buyer_email,
    organizationId: order.organization_id,
    data: { business, orderId, total: Number(order.total_usd ?? 0) },
  });
  await enqueueNotification({
    type: "order_alert",
    to: profile?.email ?? null,
    organizationId: order.organization_id,
    data: { business, orderId, total: Number(order.total_usd ?? 0) },
  });
}

/** Apply a verified Stripe event's side effects. Returns the org id if known. */
async function handleEvent(admin: Admin, event: Stripe.Event): Promise<string | null> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // DTC order checkout (mode=payment) carries an order_id. Marking paid is
      // a pure status flip — inventory was already reserved at order creation,
      // so a duplicate webhook can never double-deduct.
      const orderId = session.metadata?.order_id ?? null;
      if (orderId) {
        await admin.rpc("mark_order_paid", { p_order: orderId, p_session: session.id });
        await notifyOrderPaid(admin, orderId);
        await audit(admin, null, `commerce.${event.type}`, { order_id: orderId });
        return null;
      }

      const organizationId =
        session.client_reference_id ?? session.metadata?.organization_id ?? null;
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
      return organizationId;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id ?? null;
      if (orderId) {
        await admin.rpc("expire_order", { p_order: orderId });
        await audit(admin, null, `commerce.${event.type}`, { order_id: orderId });
      }
      return null;
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
      return organizationId;
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
        const { data: profile } = await admin
          .from("ranch_profiles")
          .select("email")
          .eq("organization_id", organizationId)
          .maybeSingle();
        await enqueueNotification({
          type: "payment_failed",
          to: profile?.email ?? null,
          organizationId,
          data: {},
        });
      }
      await audit(admin, organizationId, `billing.${event.type}`, {
        invoice_id: invoice.id,
      });
      return organizationId;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : null;
      const organizationId = await orgIdForCustomer(admin, customerId);
      await audit(admin, organizationId, `billing.${event.type}`, {
        invoice_id: invoice.id,
      });
      return organizationId;
    }

    default:
      // Unhandled event types are acknowledged but not processed.
      return null;
  }
}

export async function POST(request: NextRequest) {
  const secret = getStripeWebhookSecret();
  if (!secret) {
    // Misconfiguration — do not silently accept unverifiable events.
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
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
  const store = createEventStore(admin);

  let outcome;
  try {
    outcome = await runIdempotent(store, event.id, event.type, () =>
      handleEvent(admin, event),
    );
  } catch {
    // Ledger/DB error before processing — let Stripe retry.
    return NextResponse.json({ error: "Processing error." }, { status: 500 });
  }

  if (outcome.status === "failed") {
    // Recorded as failed; 500 makes Stripe retry, which will reprocess.
    return NextResponse.json({ error: "Processing error." }, { status: 500 });
  }

  // Fresh-processed, already-processed, and in-flight all return 200 so Stripe
  // stops retrying. `duplicate` is true only for an already-processed event.
  return NextResponse.json({
    received: true,
    duplicate: outcome.reason === "duplicate",
  });
}
