#!/usr/bin/env node
/**
 * Tier-2 outreach sender. Sends ONLY when ALL of these hold:
 *   1. the agent is ARMED (agent_autonomy.outreach_armed = true),
 *   2. an email provider is configured (RESEND_API_KEY),
 *   3. each message passes the send-safety gate (suppression, cooldown, daily
 *      cap, spam-risk, personalization, dedupe).
 * Otherwise it holds messages for approval and exits cleanly. It NEVER blasts,
 * never bypasses suppression, and logs every attempt. Default state = does nothing.
 *
 *   node agents/outreach/send.mjs [agent]   (default: growth)
 */
import { adminClient } from "../lib/supabase.mjs";
import { isAgentPaused } from "../lib/memory.mjs";
import { canSend, normalizeContact } from "../lib/send-safety.mjs";

const agent = process.argv[2] || "growth";
const db = adminClient();

let runId = null;
if (db) {
  const { data } = await db.from("agent_runs").insert({ agent: `${agent}:send`, trigger: process.env.AGENT_TRIGGER || "schedule", status: "running" }).select("id").single();
  runId = data?.id ?? null;
}
const finish = async (status, summary, stats = {}) => {
  console.log(`[${agent}:send] ${status} — ${summary}`);
  if (db && runId) await db.from("agent_runs").update({ status, summary, stats, finished_at: new Date().toISOString() }).eq("id", runId);
};

if (!db) { await finish("partial", "no DB env — nothing to send"); process.exit(0); }
if (await isAgentPaused(db, agent)) { await finish("partial", "paused by admin"); process.exit(0); }

const { data: auto } = await db.from("agent_autonomy").select("*").eq("agent", agent).maybeSingle();
const armed = !!auto?.outreach_armed;
const dailyCap = auto?.daily_send_cap ?? 10;
const cooldownDays = auto?.cooldown_days ?? 14;
const providerReady = !!process.env.RESEND_API_KEY;

// Candidate messages: human-approved, not yet sent.
const { data: queue } = await db.from("outbound_messages").select("*").eq("status", "approved").eq("agent", agent).limit(dailyCap * 2);
if (!queue?.length) { await finish("success", "no approved messages queued", { armed, providerReady }); process.exit(0); }

// Load suppression + today's send count for the gate.
const { data: supp } = await db.from("suppression_list").select("contact");
const suppressionSet = new Set((supp ?? []).map((s) => s.contact));
const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
const { count: sentTodayInit } = await db.from("outbound_messages").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", startOfDay.toISOString());
let sentToday = sentTodayInit ?? 0;

let sent = 0, held = 0, suppressed = 0;
for (const m of queue) {
  // Per-prospect history for cooldown/dedupe.
  let lastContactedAt = null;
  if (m.prospect_id) {
    const { data: p } = await db.from("founding_prospects").select("business_name, contact_name, last_contacted_at").eq("id", m.prospect_id).maybeSingle();
    lastContactedAt = p?.last_contacted_at ?? null;
    m._prospect = p ?? {};
  }
  const decision = canSend({
    body: m.body, toContact: m.to_contact, prospect: m._prospect ?? {},
    suppressionSet, lastContactedAt, cooldownDays, sentToday, dailyCap, armed,
  });
  if (decision.reasons.includes("suppressed")) {
    await db.from("outbound_messages").update({ status: "suppressed", hold_reason: "suppressed" }).eq("id", m.id);
    suppressed++; continue;
  }
  if (!decision.allowed) {
    await db.from("outbound_messages").update({ status: "held", hold_reason: decision.reasons.join(",") }).eq("id", m.id);
    held++; continue;
  }
  // Armed + passed the gate. Send (only path that contacts a human).
  if (!providerReady) {
    await db.from("outbound_messages").update({ status: "held", hold_reason: "no_email_provider" }).eq("id", m.id);
    held++; continue;
  }
  const send = await sendEmail(m.to_contact, m.subject || "Hello from OpenRange", m.body);
  if (send.ok) {
    await db.from("outbound_messages").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", m.id);
    if (m.prospect_id) await db.from("founding_prospects").update({ stage: "contacted", last_contacted_at: new Date().toISOString() }).eq("id", m.prospect_id);
    sent++; sentToday++;
  } else {
    await db.from("outbound_messages").update({ status: "failed", error: send.error ?? "send failed" }).eq("id", m.id);
  }
}

await finish(sent ? "success" : "partial",
  `armed=${armed} provider=${providerReady} · sent=${sent} held=${held} suppressed=${suppressed}`,
  { armed, providerReady, sent, held, suppressed });
process.exit(0);

// Minimal Resend send (mirrors agents/lib/supabase.mjs sendReportEmail).
async function sendEmail(to, subject, text) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return { ok: false, error: "no provider/contact" };
  const from = process.env.OUTREACH_FROM || process.env.NOTIFICATIONS_FROM || "OpenRange <onboarding@resend.dev>";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    return r.ok ? { ok: true } : { ok: false, error: `provider ${r.status}` };
  } catch (e) { return { ok: false, error: String(e).slice(0, 120) }; }
}
