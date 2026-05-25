"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { loginSchema, signUpSchema, type ActionState } from "@/modules/auth/schema";

const NOT_CONFIGURED =
  "Accounts aren't available right now. (The server is missing its Supabase configuration.)";

export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  let data;
  try {
    const supabase = await createClient();
    const res = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
        emailRedirectTo: `${publicEnv().NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });
    if (res.error) return { error: res.error.message };
    data = res.data;
  } catch {
    // Misconfigured env or unreachable auth service — don't 500 the page.
    return { error: NOT_CONFIGURED };
  }

  // Redirect must be OUTSIDE try/catch (redirect() throws NEXT_REDIRECT).
  if (data.session) redirect("/onboarding");

  return {
    message: "Check your email to confirm your account, then log in to continue.",
  };
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: "Incorrect email or password." };
  } catch {
    return { error: NOT_CONFIGURED };
  }

  const next = String(formData.get("next") || "/dashboard");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function logoutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // ignore — fall through to redirect home
  }
  redirect("/");
}
