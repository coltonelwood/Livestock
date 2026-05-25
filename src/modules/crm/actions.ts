"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";
import {
  customerSchema,
  leadSchema,
  leadStatusSchema,
  livestockSchema,
  noteSchema,
  reminderSchema,
  type CrmActionState,
} from "@/modules/crm/schema";

const emptyToNull = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : null;
};

export async function createCustomerAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const { organization } = await requireOrg();
  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    organization_id: organization.id,
    name: parsed.data.name,
    email: emptyToNull(parsed.data.email ?? null),
    phone: parsed.data.phone,
    address: parsed.data.address,
    notes: parsed.data.notes,
  });
  if (error) return { error: "Could not save customer. Please try again." };

  revalidatePath("/dashboard/customers");
  redirect("/dashboard/customers");
}

export async function createLeadAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const { organization } = await requireOrg();
  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    summary: formData.get("summary"),
    status: formData.get("status") ?? "new",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({
    organization_id: organization.id,
    source: "manual",
    status: parsed.data.status,
    name: parsed.data.name,
    email: emptyToNull(parsed.data.email ?? null),
    phone: parsed.data.phone,
    summary: parsed.data.summary,
  });
  if (error) return { error: "Could not save lead. Please try again." };

  revalidatePath("/dashboard/leads");
  redirect("/dashboard/leads");
}

export async function updateLeadStatusAction(formData: FormData) {
  await requireOrg();
  const parsed = leadStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase
    .from("leads")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);

  revalidatePath("/dashboard/leads");
}

export async function createLivestockAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const { organization } = await requireOrg();
  const parsed = livestockSchema.safeParse({
    tag: formData.get("tag"),
    name: formData.get("name"),
    species: formData.get("species") ?? "cattle",
    breed: formData.get("breed"),
    sex: formData.get("sex"),
    birth_date: formData.get("birth_date"),
    weight_lbs: formData.get("weight_lbs"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("livestock").insert({
    organization_id: organization.id,
    ...parsed.data,
  });
  if (error) return { error: "Could not save animal. Please try again." };

  revalidatePath("/dashboard/livestock");
  redirect("/dashboard/livestock");
}

export async function createReminderAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const { organization } = await requireOrg();
  const parsed = reminderSchema.safeParse({
    title: formData.get("title"),
    due_at: formData.get("due_at"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("reminders").insert({
    organization_id: organization.id,
    title: parsed.data.title,
    due_at: new Date(parsed.data.due_at).toISOString(),
    body: parsed.data.body,
  });
  if (error) return { error: "Could not save reminder. Please try again." };

  revalidatePath("/dashboard/reminders");
  redirect("/dashboard/reminders");
}

export async function addNoteAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const { organization } = await requireOrg();
  const parsed = noteSchema.safeParse({
    entity_type: formData.get("entity_type"),
    entity_id: formData.get("entity_id"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid note" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("notes").insert({
    organization_id: organization.id,
    entity_type: parsed.data.entity_type,
    entity_id: parsed.data.entity_id,
    body: parsed.data.body,
  });
  if (error) return { error: "Could not save note." };

  revalidatePath(`/dashboard/customers/${parsed.data.entity_id}`);
  return {};
}

export async function toggleReminderAction(formData: FormData) {
  await requireOrg();
  const id = String(formData.get("id") ?? "");
  const done = String(formData.get("done") ?? "") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("reminders")
    .update({ status: done ? "done" : "pending" })
    .eq("id", id);

  revalidatePath("/dashboard/reminders");
}
