"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrg, isOrgAdmin } from "@/modules/organizations/context";
import {
  validateImageFile,
  safeFilename,
  MAX_IMAGES_PER_ITEM,
} from "@/modules/media/validate";

const BUCKET = "media";

type MediaEntity = "listing" | "product";
const TABLE: Record<MediaEntity, "livestock_listings" | "meat_products"> = {
  listing: "livestock_listings",
  product: "meat_products",
};

export type MediaState = { error?: string; ok?: boolean };

function parseEntity(formData: FormData) {
  const entityType = String(formData.get("entityType") ?? "") as MediaEntity;
  const entityId = String(formData.get("entityId") ?? "");
  const table = TABLE[entityType];
  return { entityType, entityId, table };
}

/** Upload one image for a listing/product. Service-role write AFTER authorizing
 * the caller as an admin of the owning org. */
export async function uploadImageAction(
  _prev: MediaState,
  formData: FormData,
): Promise<MediaState> {
  const { organization, role } = await requireOrg();
  if (!isOrgAdmin(role)) return { error: "Only owners and admins can manage photos." };

  const { entityType, entityId, table } = parseEntity(formData);
  if (!table) return { error: "Unknown item." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image to upload." };
  const v = validateImageFile({ type: file.type, size: file.size });
  if (!v.ok) return { error: v.error };

  // Authorize + read current photos via RLS (must belong to this org).
  const supabase = await createClient();
  const { data: row } =
    table === "livestock_listings"
      ? await supabase.from("livestock_listings").select("photos").eq("id", entityId).eq("organization_id", organization.id).maybeSingle()
      : await supabase.from("meat_products").select("photos").eq("id", entityId).eq("organization_id", organization.id).maybeSingle();
  if (!row) return { error: "Item not found." };
  const photos: string[] = Array.isArray(row.photos) ? row.photos : [];
  if (photos.length >= MAX_IMAGES_PER_ITEM) return { error: "You've reached the photo limit for this item." };

  const admin = createAdminClient();
  const path = `${organization.id}/${entityType}/${entityId}/${safeFilename(file.name)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  // Wrap all Storage/DB I/O: a thrown error here must surface as a friendly
  // message, never an unhandled 500 (the upload form is a core seller flow).
  try {
    const opts = { contentType: file.type, upsert: false };
    let { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, opts);

    // Self-heal: if the bucket hasn't been provisioned on this project yet,
    // create it (public, service-role) and retry once.
    if (upErr && /bucket.*not.*found|not.*found/i.test(upErr.message ?? "")) {
      await admin.storage.createBucket(BUCKET, { public: true });
      ({ error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, opts));
    }
    if (upErr) {
      console.error("uploadImageAction storage error:", upErr.message);
      return { error: "Upload failed. Please try again in a moment." };
    }

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    const next = [...photos, pub.publicUrl];
    const { error: dbErr } =
      table === "livestock_listings"
        ? await admin.from("livestock_listings").update({ photos: next }).eq("id", entityId)
        : await admin.from("meat_products").update({ photos: next }).eq("id", entityId);
    if (dbErr) {
      console.error("uploadImageAction db error:", dbErr.message);
      return { error: "Upload failed. Please try again in a moment." };
    }
  } catch (e) {
    console.error("uploadImageAction threw:", e instanceof Error ? e.message : String(e));
    return { error: "Upload failed. Please try again in a moment." };
  }

  revalidatePath(`/dashboard/listings/${entityType === "product" ? "meat/" : ""}${entityId}`);
  return { ok: true };
}

/** Remove one image URL from a listing/product. */
export async function removeImageAction(formData: FormData) {
  const { organization, role } = await requireOrg();
  if (!isOrgAdmin(role)) return;
  const { entityType, entityId, table } = parseEntity(formData);
  const url = String(formData.get("url") ?? "");
  if (!table || !url) return;

  const supabase = await createClient();
  const { data: row } =
    table === "livestock_listings"
      ? await supabase.from("livestock_listings").select("photos").eq("id", entityId).eq("organization_id", organization.id).maybeSingle()
      : await supabase.from("meat_products").select("photos").eq("id", entityId).eq("organization_id", organization.id).maybeSingle();
  if (!row) return;
  const next = (Array.isArray(row.photos) ? row.photos : []).filter((u: string) => u !== url);

  const admin = createAdminClient();
  if (table === "livestock_listings") {
    await admin.from("livestock_listings").update({ photos: next }).eq("id", entityId);
  } else {
    await admin.from("meat_products").update({ photos: next }).eq("id", entityId);
  }
  revalidatePath(`/dashboard/listings/${entityType === "product" ? "meat/" : ""}${entityId}`);
}
