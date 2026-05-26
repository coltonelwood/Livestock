"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";

/**
 * Admin governance for the agent memory/learning layer. All gated to platform
 * admins (RLS + explicit guard). Approving a lesson/playbook change is the only
 * way agent-proposed learning becomes authoritative.
 */
const PATH = "/admin/agents/memory";
async function adminId() {
  return (await requirePlatformAdmin()).id;
}

export async function setMemoryStatusAction(formData: FormData) {
  const uid = await adminId();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["active", "rejected", "archived"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("agent_memories")
    .update({ status: status as "active" | "rejected" | "archived", approved_by: status === "active" ? uid : null })
    .eq("id", id);
  revalidatePath(PATH);
}

export async function pinMemoryAction(formData: FormData) {
  await adminId();
  const id = String(formData.get("id") ?? "");
  const pinned = String(formData.get("pinned") ?? "") === "true";
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("agent_memories").update({ pinned }).eq("id", id);
  revalidatePath(PATH);
}

export async function editMemoryAction(formData: FormData) {
  await adminId();
  const id = String(formData.get("id") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  if (!id || !summary) return;
  const supabase = await createClient();
  await supabase.from("agent_memories").update({ summary }).eq("id", id);
  revalidatePath(PATH);
}

export async function deleteMemoryAction(formData: FormData) {
  await adminId();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("agent_memories").delete().eq("id", id);
  revalidatePath(PATH);
}

export async function setLessonStatusAction(formData: FormData) {
  const uid = await adminId();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["approved", "rejected", "archived"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("agent_lessons")
    .update({ status: status as "approved" | "rejected" | "archived", approved_by: status === "approved" ? uid : null })
    .eq("id", id);
  // An approved lesson becomes a reusable successful/failed-tactic memory.
  if (status === "approved") {
    const { data: lesson } = await supabase.from("agent_lessons").select("*").eq("id", id).maybeSingle();
    if (lesson) {
      await supabase.from("agent_memories").insert({
        agent: lesson.agent, memory_type: lesson.category, summary: lesson.lesson,
        confidence_score: Math.max(0.6, lesson.confidence_score ?? 0.6), scope: "agent",
        tags: lesson.tags ?? [], status: "active", approved_by: uid, source: `lesson:${id}`,
      });
    }
  }
  revalidatePath(PATH);
}

/** Reset an agent's memory — archives (does not hard-delete) so it's auditable. */
export async function resetAgentMemoryAction(formData: FormData) {
  await adminId();
  const agent = String(formData.get("agent") ?? "");
  if (!agent) return;
  const supabase = await createClient();
  await supabase.from("agent_memories").update({ status: "archived" }).eq("agent", agent).eq("status", "active");
  await supabase.from("agent_lessons").update({ status: "archived" }).eq("agent", agent).neq("status", "archived");
  revalidatePath(PATH);
}

/** Apply or discard an agent-proposed playbook change (approval required). */
export async function resolvePlaybookUpdateAction(formData: FormData) {
  const uid = await adminId();
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || !["approve", "reject"].includes(decision)) return;
  const supabase = await createClient();
  const { data: pb } = await supabase.from("agent_playbooks").select("*").eq("id", id).maybeSingle();
  if (!pb) return;
  if (decision === "approve" && pb.pending_changes) {
    const merged = { ...(pb.pending_changes as Record<string, unknown>), version: (pb.version ?? 1) + 1, status: "active", pending_changes: null, proposed_by: null, approved_by: uid };
    await supabase.from("agent_playbooks").update(merged as never).eq("id", id);
  } else {
    await supabase.from("agent_playbooks").update({ status: "active", pending_changes: null, proposed_by: null }).eq("id", id);
  }
  revalidatePath(PATH);
}

export async function setExperimentDecisionAction(formData: FormData) {
  const uid = await adminId();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const allowed = ["approved", "running", "complete", "adopted", "rejected", "retest", "needs_data"];
  if (!id || !allowed.includes(status)) return;
  const supabase = await createClient();
  await supabase.from("agent_experiments")
    .update({ status: status as never, decision: decision || null, approved_by: uid })
    .eq("id", id);
  revalidatePath(PATH);
}

/** "Was this useful?" feedback — fed into future retrieval ranking. */
export async function recordFeedbackAction(formData: FormData) {
  const uid = await adminId();
  const target_type = String(formData.get("target_type") ?? "");
  const rating = String(formData.get("rating") ?? "");
  const target_id = String(formData.get("target_id") ?? "") || null;
  const agent = String(formData.get("agent") ?? "") || null;
  const notes = String(formData.get("notes") ?? "") || null;
  if (!target_type || !["useful", "not_useful", "partial"].includes(rating)) return;
  const supabase = await createClient();
  await supabase.from("agent_feedback").insert({
    agent, target_type, target_id, rating: rating as "useful" | "not_useful" | "partial", notes, created_by: uid,
  });
  // Reinforce/penalize the underlying memory's confidence so ranking shifts.
  if (target_type === "memory" && target_id) {
    const { data: m } = await supabase.from("agent_memories").select("confidence_score").eq("id", target_id).maybeSingle();
    if (m) {
      const delta = rating === "useful" ? 0.1 : rating === "not_useful" ? -0.15 : 0;
      const next = Math.max(0, Math.min(1, (m.confidence_score ?? 0.5) + delta));
      await supabase.from("agent_memories").update({ confidence_score: next }).eq("id", target_id);
    }
  }
  revalidatePath(PATH);
}
