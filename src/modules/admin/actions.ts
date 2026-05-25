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
