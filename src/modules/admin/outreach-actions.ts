"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";
// Pure safety engine shared with the sender script.
import { spamRiskScore, normalizeContact } from "../../../agents/lib/send-safety.mjs";
import { classifyReply, replyAction } from "../../../agents/lib/reply-classify.mjs";

const PATH = "/admin/agents/outreach";
async function adminId() {
  return (await requirePlatformAdmin()).id;
}

/** Arm/disarm Tier-2 sending + set daily cap. ARM defaults OFF; this is the
 * master kill-switch — even an "approved" message won't send unless armed. */
export async function setAutonomyAction(formData: FormData) {
  const uid = await adminId();
  const agent = String(formData.get("agent") ?? "");
  if (!agent) return;
  const armed = String(formData.get("outreach_armed") ?? "") === "true";
  const cap = Math.max(0, Math.min(50, parseInt(String(formData.get("daily_send_cap") ?? "10"), 10) || 10));
  const supabase = await createClient();
  const { data: existing } = await supabase.from("agent_autonomy").select("agent").eq("agent", agent).maybeSingle();
  if (existing) {
    await supabase.from("agent_autonomy").update({ outreach_armed: armed, daily_send_cap: cap, updated_by: uid }).eq("agent", agent);
  } else {
    await supabase.from("agent_autonomy").insert({ agent, tier: 2, outreach_armed: armed, daily_send_cap: cap, updated_by: uid });
  }
  revalidatePath(PATH);
}

/** Promote an APPROVED outreach draft into the outbound queue, scoring its spam
 * risk. Low-risk → 'approved' (still won't send unless the agent is armed);
 * risky → 'held' for a human. */
export async function enqueueOutreachAction(formData: FormData) {
  await adminId();
  const draftId = String(formData.get("draft_id") ?? "");
  if (!draftId) return;
  const supabase = await createClient();
  const { data: draft } = await supabase.from("outreach_drafts").select("*").eq("id", draftId).maybeSingle();
  if (!draft || draft.status !== "approved") return;
  let prospect: { business_name?: string | null; contact_name?: string | null; email?: string | null } = {};
  if (draft.prospect_id) {
    const { data } = await supabase.from("founding_prospects").select("business_name, contact_name, email").eq("id", draft.prospect_id).maybeSingle();
    if (data) prospect = data;
  }
  const { score, reasons } = spamRiskScore(draft.body, prospect);
  const status = score >= 40 ? "held" : "approved";
  await supabase.from("outbound_messages").insert({
    prospect_id: draft.prospect_id, channel: draft.channel === "sms" ? "sms" : "email",
    to_contact: prospect.email ?? null, subject: draft.subject, body: draft.body,
    status, spam_risk: score, risk_reasons: reasons,
    hold_reason: status === "held" ? "spam_risk" : null,
  });
  revalidatePath(PATH);
}

export async function setOutboundStatusAction(formData: FormData) {
  const uid = await adminId();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["approved", "held", "cancelled"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("outbound_messages")
    .update({ status: status as "approved" | "held" | "cancelled", approved_by: status === "approved" ? uid : null })
    .eq("id", id);
  revalidatePath(PATH);
}

export async function addSuppressionAction(formData: FormData) {
  await adminId();
  const contact = normalizeContact(String(formData.get("contact") ?? ""));
  if (!contact) return;
  const reason = String(formData.get("reason") ?? "manual");
  const supabase = await createClient();
  await supabase.from("suppression_list").upsert(
    { contact, reason: (["opt_out", "bounce", "complaint", "manual", "hard_block"].includes(reason) ? reason : "manual") as never },
    { onConflict: "contact" },
  );
  revalidatePath(PATH);
}

/** Log an inbound reply, auto-classify it, and apply the safe follow-up:
 * advance the prospect's stage and suppress on a clear "no". */
export async function logInboundReplyAction(formData: FormData) {
  await adminId();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const from_contact = normalizeContact(String(formData.get("from_contact") ?? "")) || null;
  const prospect_id = String(formData.get("prospect_id") ?? "") || null;
  const { category, confidence } = classifyReply(body);
  const supabase = await createClient();
  await supabase.from("inbound_replies").insert({ prospect_id, from_contact, body, classification: category, confidence });
  const action = replyAction(category);
  if (prospect_id && action.stage) await supabase.from("founding_prospects").update({ stage: action.stage as never }).eq("id", prospect_id);
  if (action.suppress && from_contact) {
    await supabase.from("suppression_list").upsert({ contact: from_contact, reason: "opt_out" as never }, { onConflict: "contact" });
  }
  revalidatePath(PATH);
}

export async function markReplyHandledAction(formData: FormData) {
  await adminId();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("inbound_replies").update({ handled: true }).eq("id", id);
  revalidatePath(PATH);
}
