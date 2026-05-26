#!/usr/bin/env node
/**
 * Weekly agent self-improvement report. Pure aggregation over the last 7 days of
 * runs/findings/decisions/feedback/approvals — no LLM, no fabrication. Writes a
 * summary to analytics_reports and self-scores to agent_performance_metrics.
 */
import { adminClient, sendReportEmail } from "../lib/supabase.mjs";
import { isAgentPaused } from "../lib/memory.mjs";
import { aggregate, buildImprovementReport } from "../lib/improve-core.mjs";

function isoWeek(d = new Date()) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
  const ys = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return `${dt.getUTCFullYear()}-W${String(Math.ceil(((dt - ys) / 86400000 + 1) / 7)).padStart(2, "0")}`;
}

const db = adminClient();
const period = isoWeek();
const since = new Date(Date.now() - 7 * 86400000).toISOString();

let runId = null;
if (db) {
  const { data } = await db.from("agent_runs").insert({ agent: "improve", trigger: process.env.AGENT_TRIGGER || "schedule", status: "running" }).select("id").single();
  runId = data?.id ?? null;
}

if (await isAgentPaused(db, "improve")) {
  if (runId) await db.from("agent_runs").update({ status: "partial", summary: "paused by admin", finished_at: new Date().toISOString() }).eq("id", runId);
  console.log("improve agent is paused by admin — exiting.");
  process.exit(0);
}

let per = {};
if (db) {
  const [runs, findings, decisions, feedback, tasks] = await Promise.all([
    db.from("agent_runs").select("agent, status").gte("started_at", since),
    db.from("qa_findings").select("id").gte("created_at", since),
    db.from("agent_decisions").select("agent").gte("created_at", since),
    db.from("agent_feedback").select("agent, rating").gte("created_at", since),
    db.from("agent_tasks").select("agent, status").gte("created_at", since),
  ]);
  per = aggregate({
    runs: runs.data ?? [],
    findings: (findings.data ?? []).map((f) => ({ ...f, _agent: "ops" })),
    decisions: decisions.data ?? [],
    feedback: feedback.data ?? [],
    approvals: tasks.data ?? [],
  });
}

const { title, body, metrics } = buildImprovementReport(period, per);
console.log(body);

if (db) {
  await db.from("analytics_reports").insert({ period, kind: "weekly_improvement", title, body, metrics: {} });
  if (metrics.length) await db.from("agent_performance_metrics").insert(metrics);
  if (runId) await db.from("agent_runs").update({ status: "success", finished_at: new Date().toISOString(), summary: title, stats: { agents: Object.keys(per).length, metrics: metrics.length } }).eq("id", runId);
}
await sendReportEmail(title, body);
process.exit(0);
