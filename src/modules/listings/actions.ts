"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrg } from "@/modules/organizations/context";
import { canCreateListing } from "@/modules/billing/entitlements";
import { enforce } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { enqueueNotification } from "@/lib/notifications/enqueue";
import {
  inquirySchema,
  livestockListingSchema,
  meatProductSchema,
  type InquiryState,
  type ListingActionState,
} from "@/modules/listings/schema";

export async function createListingAction(
  _prev: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const { organization } = await requireOrg();
  const parsed = livestockListingSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    species: formData.get("species") ?? "cattle",
    breed: formData.get("breed"),
    quantity: formData.get("quantity"),
    price_usd: formData.get("price_usd"),
    location: formData.get("location"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const publish = formData.get("publish") === "true";

  // Plan limit: publishing counts against the active-listing entitlement.
  // Drafts are always allowed.
  if (publish) {
    const decision = await canCreateListing();
    if (!decision.allowed) {
      return {
        error: `Your plan allows ${decision.limit} active listings. Upgrade to publish more, or save as a draft.`,
      };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("livestock_listings")
    .insert({
      organization_id: organization.id,
      seller_name: organization.name,
      status: publish ? "active" : "draft",
      ...parsed.data,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Could not save listing. Please try again." };

  revalidatePath("/dashboard/listings");
  // Land on the listing's photo manager so adding pictures is the next step.
  redirect(`/dashboard/listings/${data.id}`);
}

export async function createMeatProductAction(
  _prev: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const { organization } = await requireOrg();
  const parsed = meatProductSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    product_type: formData.get("product_type") ?? "retail_cut",
    price_usd: formData.get("price_usd"),
    unit: formData.get("unit") ?? "each",
    inventory: formData.get("inventory"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const supabase = await createClient();
  const publish = formData.get("publish") === "true";
  const { data, error } = await supabase
    .from("meat_products")
    .insert({
      organization_id: organization.id,
      seller_name: organization.name,
      status: publish ? "active" : "draft",
      ...parsed.data,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Could not save product. Please try again." };

  revalidatePath("/dashboard/listings");
  redirect(`/dashboard/listings/meat/${data.id}`);
}

// Sellers may publish (active) or unpublish (draft) their own items. "archived"
// stays a moderation-only state handled by platform admins.
function parseSellerStatus(value: FormDataEntryValue | null): "active" | "draft" {
  return value === "active" ? "active" : "draft";
}

export async function updateListingAction(
  _prev: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const { organization } = await requireOrg();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing listing." };

  const parsed = livestockListingSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    species: formData.get("species") ?? "cattle",
    breed: formData.get("breed"),
    quantity: formData.get("quantity"),
    price_usd: formData.get("price_usd"),
    location: formData.get("location"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }
  const status = parseSellerStatus(formData.get("status"));

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("livestock_listings")
    .select("status")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!current) return { error: "Listing not found." };

  // Publishing a previously-unpublished listing counts against the plan limit.
  if (status === "active" && current.status !== "active") {
    const decision = await canCreateListing();
    if (!decision.allowed) {
      return {
        error: `Your plan allows ${decision.limit} active listings. Upgrade to publish more, or keep this as a draft.`,
      };
    }
  }

  const { error } = await supabase
    .from("livestock_listings")
    .update({ status, ...parsed.data })
    .eq("id", id)
    .eq("organization_id", organization.id);
  if (error) return { error: "Could not save changes. Please try again." };

  revalidatePath("/dashboard/listings");
  revalidatePath(`/dashboard/listings/${id}`);
  return { saved: true };
}

export async function updateMeatProductAction(
  _prev: ListingActionState,
  formData: FormData,
): Promise<ListingActionState> {
  const { organization } = await requireOrg();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing product." };

  const parsed = meatProductSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    product_type: formData.get("product_type") ?? "retail_cut",
    price_usd: formData.get("price_usd"),
    unit: formData.get("unit") ?? "each",
    inventory: formData.get("inventory"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }
  const status = parseSellerStatus(formData.get("status"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("meat_products")
    .update({ status, ...parsed.data })
    .eq("id", id)
    .eq("organization_id", organization.id);
  if (error) return { error: "Could not save changes. Please try again." };

  revalidatePath("/dashboard/listings");
  revalidatePath(`/dashboard/listings/meat/${id}`);
  return { saved: true };
}

export async function deleteListingAction(formData: FormData) {
  const { organization } = await requireOrg();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("livestock_listings")
    .delete()
    .eq("id", id)
    .eq("organization_id", organization.id);
  revalidatePath("/dashboard/listings");
  redirect("/dashboard/listings");
}

export async function deleteMeatProductAction(formData: FormData) {
  const { organization } = await requireOrg();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("meat_products")
    .delete()
    .eq("id", id)
    .eq("organization_id", organization.id);
  revalidatePath("/dashboard/listings");
  redirect("/dashboard/listings");
}

/**
 * Public inquiry submission. This is a TRUSTED server boundary: it validates
 * input, drops bot submissions (honeypot), and uses the service-role client to
 * write the inquiry + a lead for the listing's organization. Anonymous users
 * have no direct RLS insert path by design.
 */
export async function submitInquiryAction(
  _prev: InquiryState,
  formData: FormData,
): Promise<InquiryState> {
  // Raw values echoed back on any failure so a buyer never loses what they typed.
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  const parsed = inquirySchema.safeParse({
    listingType: formData.get("listingType"),
    listingId: formData.get("listingId"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message"),
    company: formData.get("company"),
  });
  // Honeypot or invalid → respond success-shaped without writing, to avoid
  // leaking which fields tripped a bot.
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === "company")) {
      return { success: true };
    }
    return { error: parsed.error.issues[0]?.message ?? "Please check your details.", values };
  }

  // Durable rate limit (per IP and per listing). This is a public, non-AI write
  // with no model-token cost, so we FAIL OPEN when the store is unavailable —
  // a down/misconfigured Redis must never silently swallow real buyer leads.
  // Durable limiting still applies whenever Upstash IS configured.
  const ip = clientIp(await headers());
  const gate = await enforce(
    [
      { name: "inquiry", identifier: ip },
      { name: "inquiry", identifier: `listing:${parsed.data.listingId}` },
    ],
    { failOpen: true },
  );
  if (!gate.allowed) {
    return {
      error: "Too many messages from your connection. Please try again shortly.",
      values,
    };
  }

  const admin = createAdminClient();
  const table = parsed.data.listingType === "livestock"
    ? "livestock_listings"
    : "meat_products";

  // Resolve the listing's org, and confirm it is publicly active.
  const { data: listing } = await admin
    .from(table)
    .select("id, organization_id, status")
    .eq("id", parsed.data.listingId)
    .maybeSingle();

  if (!listing || listing.status !== "active") {
    return { error: "This listing is no longer available.", values };
  }

  const email = parsed.data.email && parsed.data.email.length > 0 ? parsed.data.email : null;
  const phone = parsed.data.phone && parsed.data.phone.length > 0 ? parsed.data.phone : null;
  const message = parsed.data.message && parsed.data.message.length > 0 ? parsed.data.message : null;

  const { data: lead, error: leadError } = await admin
    .from("leads")
    .insert({
      organization_id: listing.organization_id,
      source: "listing_inquiry",
      status: "new",
      name: parsed.data.name,
      email,
      phone,
      summary: message,
    })
    .select("id")
    .single();

  // The lead is the thing we must not lose. If it failed to write, tell the
  // buyer plainly (and keep their text) rather than pretending it went through.
  if (leadError || !lead) {
    return {
      error: "We couldn't send your message just now. Please try again, or call the seller directly.",
      values,
    };
  }

  await admin.from("listing_inquiries").insert({
    organization_id: listing.organization_id,
    listing_type: parsed.data.listingType,
    listing_id: listing.id,
    lead_id: lead?.id ?? null,
    name: parsed.data.name,
    email,
    phone,
    message,
  });

  // Notify the seller and confirm to the buyer (best-effort; never blocks).
  const { data: profile } = await admin
    .from("ranch_profiles")
    .select("display_name, email")
    .eq("organization_id", listing.organization_id)
    .maybeSingle();
  const business = profile?.display_name ?? undefined;
  await enqueueNotification({
    type: "inquiry_alert",
    to: profile?.email ?? null,
    organizationId: listing.organization_id,
    data: { business, leadName: parsed.data.name, contact: email ?? phone ?? undefined },
  });
  await enqueueNotification({
    type: "inquiry_confirmation",
    to: email,
    organizationId: listing.organization_id,
    data: { business, buyerName: parsed.data.name },
  });

  return { success: true };
}
