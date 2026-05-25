"use server";

import { z } from "zod";
import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";
import { enforce } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(160),
  email: z.string().trim().email("Enter a valid email"),
  business: z.string().trim().max(160).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  // Honeypot
  website: z.string().max(0).optional(),
});

export type ContactState = {
  error?: string;
  success?: boolean;
  // Echoed back on failure so a failed submit never wipes what was typed.
  values?: { name?: string; email?: string; business?: string; message?: string };
};

export async function submitContactAction(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    business: String(formData.get("business") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    business: formData.get("business"),
    message: formData.get("message"),
    website: formData.get("website"),
  });
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === "website")) {
      return { success: true };
    }
    return { error: parsed.error.issues[0]?.message ?? "Please check your details.", values };
  }

  // Non-AI public form — FAIL OPEN when the rate-limit store is unavailable so a
  // down/missing Redis can't silently drop demo requests. Durable limiting still
  // applies whenever Upstash is configured.
  const ip = clientIp(await headers());
  const gate = await enforce(
    [{ name: "contact", identifier: ip }],
    { failOpen: true },
  );
  if (!gate.allowed) {
    return { error: "Too many requests. Please try again later.", values };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Something went wrong. Please try again.", values };
  }
  const { error } = await admin.from("contact_requests").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    business: parsed.data.business || null,
    message: parsed.data.message || null,
  });
  if (error) return { error: "Something went wrong. Please try again.", values };

  return { success: true };
}
