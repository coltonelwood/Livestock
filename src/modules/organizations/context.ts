import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { Organization, OrgRole } from "@/lib/db/types";

export const ORG_COOKIE = "or_active_org";

export type Membership = { organization: Organization; role: OrgRole };

/**
 * All organizations the current user belongs to, with their role. RLS ensures
 * this only ever returns memberships that are genuinely the user's.
 */
export async function getMemberships(): Promise<Membership[]> {
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .order("created_at", { ascending: true });

  if (!members || members.length === 0) return [];

  const { data: orgs } = await supabase
    .from("organizations")
    .select("*")
    .in(
      "id",
      members.map((m) => m.organization_id),
    );

  const byId = new Map((orgs ?? []).map((o) => [o.id, o as Organization]));
  return members
    .map((m) => {
      const organization = byId.get(m.organization_id);
      return organization ? { organization, role: m.role as OrgRole } : null;
    })
    .filter((m): m is Membership => m !== null);
}

/**
 * Pure resolution of the active org from a membership list and a cookie hint.
 * The hint is ALWAYS validated against real membership — a forged cookie can
 * never select an org the user doesn't belong to. Falls back to the first
 * membership; returns null when the user has no orgs (→ onboarding).
 */
export function resolveActiveOrg(
  memberships: Membership[],
  hintedOrgId: string | undefined,
): Membership | null {
  if (memberships.length === 0) return null;
  const matched = memberships.find((m) => m.organization.id === hintedOrgId);
  return matched ?? memberships[0];
}

/**
 * Resolve the active organization for the current request (cookie hint
 * validated against membership).
 */
export async function getCurrentOrg(): Promise<Membership | null> {
  const memberships = await getMemberships();
  const cookieStore = await cookies();
  return resolveActiveOrg(memberships, cookieStore.get(ORG_COOKIE)?.value);
}

/** Require an active org; send brand-new users to onboarding. */
export async function requireOrg(): Promise<Membership> {
  await requireUser();
  const current = await getCurrentOrg();
  if (!current) redirect("/onboarding");
  return current;
}

/** True if the membership role can perform admin actions. */
export function isOrgAdmin(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}
