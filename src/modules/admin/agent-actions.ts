"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";

/**
 * Approval actions for the Agent Control Center. Every risky action an agent
 * proposes (a task, an outreach message, a content post, a moderation action)
 * stays inert until a platform admin approves it here. RLS restricts these
 * tables to platform admins; we also guard explicitly.
 *
 * NOTE: "approve" only flips status — it does NOT send/merge/spend/ban. The
 * actual side-effecting step (e.g. sending an approved email) is a separate,
 * deliberate human-triggered action by design.
 */
async function adminId() {
  const profile = await requirePlatformAdmin();
  return profile.id;
}

const PATH = "/admin/agents";

export async function setTaskStatusAction(formData: FormData) {
  const uid = await adminId();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["approved", "rejected"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("agent_tasks")
    .update({ status: status as "approved" | "rejected", approved_by: uid, approved_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(PATH);
}

export async function setOutreachStatusAction(formData: FormData) {
  const uid = await adminId();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["approved", "rejected"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("outreach_drafts")
    .update({ status: status as "approved" | "rejected", approved_by: uid, approved_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath(PATH);
}

export async function setContentStatusAction(formData: FormData) {
  await adminId();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["approved", "rejected"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("content_drafts").update({ status: status as "approved" | "rejected" }).eq("id", id);
  revalidatePath(PATH);
}

export async function setFindingStatusAction(formData: FormData) {
  await adminId();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["acknowledged", "resolved", "ignored"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("qa_findings").update({ status: status as "acknowledged" | "resolved" | "ignored" }).eq("id", id);
  revalidatePath(PATH);
}

export async function setModerationStatusAction(formData: FormData) {
  await adminId();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["approved_action", "dismissed"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("moderation_queue").update({ status: status as "approved_action" | "dismissed" }).eq("id", id);
  revalidatePath(PATH);
}

/** Pause/resume an agent. A paused agent records a run and exits without acting,
 * giving the admin a hard kill-switch for the 24/7 system. */
export async function setAgentPausedAction(formData: FormData) {
  const uid = await adminId();
  const agent = String(formData.get("agent") ?? "");
  const paused = String(formData.get("paused") ?? "");
  if (!agent || !["true", "false"].includes(paused)) return;
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("agent_preferences").select("id").eq("agent", agent).eq("key", "paused").maybeSingle();
  if (existing) {
    await supabase.from("agent_preferences").update({ value: paused }).eq("id", existing.id);
  } else {
    await supabase.from("agent_preferences").insert({ scope: "agent", agent, key: "paused", value: paused, created_by: uid });
  }
  revalidatePath(PATH);
}
