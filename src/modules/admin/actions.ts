"use server";

import { revalidatePath } from "next/cache";

import { requirePlatformAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Moderation: archive a livestock listing. Uses the service-role client because
 * platform admins are not org members, so RLS would otherwise block the write.
 * Gated by requirePlatformAdmin() before any privileged action.
 */
export async function archiveListingAction(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const admin = createAdminClient();
  await admin
    .from("livestock_listings")
    .update({ status: "archived" })
    .eq("id", id);

  // Record the moderation action for auditability.
  await admin.from("audit_logs").insert({
    action: "listing.archived",
    entity_type: "livestock_listing",
    entity_id: id,
    metadata: { via: "admin_moderation" },
  });

  revalidatePath("/admin/listings");
}

/** Moderation: archive a meat product. */
export async function archiveProductAction(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const admin = createAdminClient();
  await admin.from("meat_products").update({ status: "archived" }).eq("id", id);
  await admin.from("audit_logs").insert({
    action: "product.archived",
    entity_type: "meat_product",
    entity_id: id,
    metadata: { via: "admin_moderation" },
  });
  revalidatePath("/admin/products");
}

/** Moderation: cancel an auction (platform admin). The RPC writes the audit. */
export async function cancelAuctionAdminAction(formData: FormData) {
  await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // Per-user client: cancel_auction permits platform admins via is_platform_admin().
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.rpc("cancel_auction", { p_auction: id });
  revalidatePath("/admin/auctions");
}
