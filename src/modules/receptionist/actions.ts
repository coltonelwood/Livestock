"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requireOrg, isOrgAdmin } from "@/modules/organizations/context";
import {
  agentSchema,
  profileSchema,
  type ReceptionistActionState,
} from "@/modules/receptionist/schema";

export async function saveAgentAction(
  _prev: ReceptionistActionState,
  formData: FormData,
): Promise<ReceptionistActionState> {
  const { organization, role } = await requireOrg();
  if (!isOrgAdmin(role)) return { error: "Only owners and admins can change this." };

  const parsed = agentSchema.safeParse({
    greeting: formData.get("greeting"),
    system_prompt: formData.get("system_prompt"),
    qualification_questions: formData.get("qualification_questions"),
    is_active: formData.get("is_active"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("ai_agents")
    .select("id")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const payload = {
    greeting: parsed.data.greeting,
    system_prompt: parsed.data.system_prompt,
    qualification_questions: parsed.data.qualification_questions,
    is_active: parsed.data.is_active,
  };

  const { error } = existing
    ? await supabase.from("ai_agents").update(payload).eq("id", existing.id)
    : await supabase
        .from("ai_agents")
        .insert({ organization_id: organization.id, name: "Receptionist", ...payload });

  if (error) return { error: "Could not save. Please try again." };

  revalidatePath("/dashboard/receptionist");
  return { saved: true };
}

export async function saveProfileAction(
  _prev: ReceptionistActionState,
  formData: FormData,
): Promise<ReceptionistActionState> {
  const { organization, role } = await requireOrg();
  if (!isOrgAdmin(role)) return { error: "Only owners and admins can change this." };

  const parsed = profileSchema.safeParse({
    display_name: formData.get("display_name"),
    bio: formData.get("bio"),
    location: formData.get("location"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    is_public: formData.get("is_public"),
    faq: formData.get("faq"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ranch_profiles")
    .update({
      display_name: parsed.data.display_name,
      bio: parsed.data.bio,
      location: parsed.data.location,
      phone: parsed.data.phone,
      email: parsed.data.email,
      is_public: parsed.data.is_public,
      faq: parsed.data.faq,
    })
    .eq("organization_id", organization.id);

  if (error) return { error: "Could not save. Please try again." };

  revalidatePath("/dashboard/receptionist");
  return { saved: true };
}
