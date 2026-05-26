// Minimal service-role Supabase client for agent scripts. Returns null when env
// is absent so scripts run (and report) locally without DB writes.
import { createClient } from "@supabase/supabase-js";

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Best-effort email via Resend (used for the daily report). No-op without key. */
export async function sendReportEmail(subject, markdown) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.OPS_REPORT_EMAIL;
  if (!key || !to) return { skipped: true };
  const from = process.env.NOTIFICATIONS_FROM ?? "OpenRange Ops <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text: markdown }),
    });
    return { ok: res.ok };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
