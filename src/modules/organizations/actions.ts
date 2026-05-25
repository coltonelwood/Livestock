"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { getMemberships, ORG_COOKIE } from "@/modules/organizations/context";
import {
  createOrgSchema,
  slugify,
  type OrgActionState,
} from "@/modules/organizations/schema";

const ORG_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

export async function createOrganizationAction(
  _prev: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  await requireUser();

  const parsed = createOrgSchema.safeParse({
    name: formData.get("name"),
    businessType: formData.get("businessType"),
    location: formData.get("location") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const supabase = await createClient();
  const base = slugify(parsed.data.name);

  // Create the org via the SECURITY DEFINER RPC (atomically seeds the owner
  // membership + ranch profile). Retry once with a suffix on slug collision.
  let orgId: string | null = null;
  for (const slug of [base, `${base}-${Math.random().toString(36).slice(2, 6)}`]) {
    const { data, error } = await supabase.rpc("create_organization", {
      p_name: parsed.data.name,
      p_slug: slug,
      p_business_type: parsed.data.businessType,
    });
    if (!error && data) {
      orgId = data;
      break;
    }
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      return { error: "Could not create organization. Please try again." };
    }
  }
  if (!orgId) {
    return { error: "That business name is taken. Try a different one." };
  }

  if (parsed.data.location) {
    await supabase
      .from("ranch_profiles")
      .update({ location: parsed.data.location })
      .eq("organization_id", orgId);
  }

  (await cookies()).set(ORG_COOKIE, orgId, ORG_COOKIE_OPTS);
  redirect("/dashboard");
}

/** Switch the active organization (cookie hint, validated against membership). */
export async function switchOrganizationAction(formData: FormData) {
  await requireUser();
  const target = String(formData.get("organizationId") ?? "");

  const memberships = await getMemberships();
  const allowed = memberships.some((m) => m.organization.id === target);
  if (allowed) {
    (await cookies()).set(ORG_COOKIE, target, ORG_COOKIE_OPTS);
  }
  redirect("/dashboard");
}
