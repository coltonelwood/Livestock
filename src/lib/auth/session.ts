import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/db/types";

/** Current auth user, or null if signed out. */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Require an authenticated user; redirect to /login otherwise. */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** The current user's profile row (RLS-scoped to self). */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", (await getUser())?.id ?? "")
    .maybeSingle();
  return data ?? null;
}

/** Require a platform admin; non-admins are sent to their dashboard. */
export async function requirePlatformAdmin(): Promise<Profile> {
  await requireUser();
  const profile = await getProfile();
  if (!profile || profile.platform_role !== "platform_admin") {
    redirect("/dashboard");
  }
  return profile;
}
