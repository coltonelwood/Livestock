"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrg } from "@/modules/organizations/context";
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

  const supabase = await createClient();
  const publish = formData.get("publish") === "true";
  const { error } = await supabase.from("livestock_listings").insert({
    organization_id: organization.id,
    seller_name: organization.name,
    status: publish ? "active" : "draft",
    ...parsed.data,
  });
  if (error) return { error: "Could not save listing. Please try again." };

  revalidatePath("/dashboard/listings");
  redirect("/dashboard/listings");
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
  const { error } = await supabase.from("meat_products").insert({
    organization_id: organization.id,
    seller_name: organization.name,
    status: publish ? "active" : "draft",
    ...parsed.data,
  });
  if (error) return { error: "Could not save product. Please try again." };

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
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
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
    return { error: "This listing is no longer available." };
  }

  const email = parsed.data.email && parsed.data.email.length > 0 ? parsed.data.email : null;
  const phone = parsed.data.phone && parsed.data.phone.length > 0 ? parsed.data.phone : null;
  const message = parsed.data.message && parsed.data.message.length > 0 ? parsed.data.message : null;

  const { data: lead } = await admin
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

  return { success: true };
}
