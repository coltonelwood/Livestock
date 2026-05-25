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

export type ContactState = { error?: string; success?: boolean };

export async function submitContactAction(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
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
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  }

  const ip = clientIp(await headers());
  const gate = await enforce(
    [{ name: "contact", identifier: ip }],
    { failOpen: false },
  );
  if (!gate.allowed) {
    return { error: "Too many requests. Please try again later." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("contact_requests").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    business: parsed.data.business || null,
    message: parsed.data.message || null,
  });
  if (error) return { error: "Something went wrong. Please try again." };

  return { success: true };
}
