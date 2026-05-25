"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrg, isOrgAdmin } from "@/modules/organizations/context";
import { enforce } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import { enqueueNotification } from "@/lib/notifications/enqueue";
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

const chatLeadSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(1, "Enter your name").max(160),
  contact: z.string().trim().min(1, "Enter a phone or email").max(200),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  // Honeypot
  company: z.string().max(0).optional(),
});

export type ChatLeadState = {
  error?: string;
  success?: boolean;
  values?: { name?: string; contact?: string; message?: string };
};

/**
 * Public fallback lead capture for the storefront chat widget. Shown when the
 * AI chat is unavailable so a visitor can still leave their details. Mirrors the
 * listing-inquiry boundary: anonymous, service-role write, non-AI, FAIL OPEN on
 * a missing/down rate-limit store so we never silently drop a real lead.
 */
export async function captureChatLeadAction(
  _prev: ChatLeadState,
  formData: FormData,
): Promise<ChatLeadState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    contact: String(formData.get("contact") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  const parsed = chatLeadSchema.safeParse({
    organizationId: formData.get("organizationId"),
    name: formData.get("name"),
    contact: formData.get("contact"),
    message: formData.get("message"),
    company: formData.get("company"),
  });
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === "company")) {
      return { success: true };
    }
    return { error: parsed.error.issues[0]?.message ?? "Please check your details.", values };
  }

  const ip = clientIp(await headers());
  const gate = await enforce(
    [
      { name: "inquiry", identifier: ip },
      { name: "inquiry", identifier: `org:${parsed.data.organizationId}` },
    ],
    { failOpen: true },
  );
  if (!gate.allowed) {
    return { error: "Too many messages from your connection. Please try again shortly.", values };
  }

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("id", parsed.data.organizationId)
    .maybeSingle();
  if (!org) return { error: "This business is no longer available.", values };

  const contact = parsed.data.contact;
  const isEmail = /.+@.+\..+/.test(contact);
  const { data: lead, error: leadError } = await admin
    .from("leads")
    .insert({
      organization_id: org.id,
      source: "web_chat",
      status: "new",
      name: parsed.data.name,
      email: isEmail ? contact : null,
      phone: isEmail ? null : contact,
      summary: parsed.data.message || null,
    })
    .select("id")
    .single();

  if (leadError || !lead) {
    return {
      error: "We couldn't send your details just now. Please try again, or call the seller directly.",
      values,
    };
  }

  // Best-effort seller alert; never blocks the visitor's confirmation.
  const { data: profile } = await admin
    .from("ranch_profiles")
    .select("email")
    .eq("organization_id", org.id)
    .maybeSingle();
  await enqueueNotification({
    type: "lead_alert",
    to: profile?.email ?? null,
    organizationId: org.id,
    data: { leadName: parsed.data.name, contact },
  });

  return { success: true };
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
    website: formData.get("website"),
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
      website: parsed.data.website,
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
