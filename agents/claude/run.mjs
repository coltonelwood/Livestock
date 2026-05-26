#!/usr/bin/env node
/**
 * Generic Claude-powered agent runner.
 *
 *   node agents/claude/run.mjs <agent>
 *
 * Loads /agents/<agent>.md as the system prompt, asks Claude for a strict-JSON
 * set of proposals, and writes them to the agent's draft table — ALWAYS in a
 * pending/proposed state that requires human approval in the Control Center.
 *
 * It never sends, spends, merges, deploys, or deletes. Without ANTHROPIC_API_KEY
 * it records a skipped run and exits 0 (so scheduled workflows stay green until
 * the operator wires up the key).
 *
 * Env: ANTHROPIC_API_KEY (to actually run), NEXT_PUBLIC_SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY (to persist), ANTHROPIC_MODEL (optional).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { adminClient } from "../lib/supabase.mjs";
import { targetFor, parseItems, prepareRows } from "../lib/agent-io.mjs";

const agent = process.argv[2];
if (!agent) { console.error("usage: run.mjs <agent>"); process.exit(2); }
const here = path.dirname(fileURLToPath(import.meta.url));
const instrPath = path.join(here, "..", `${agent}.md`);
if (!fs.existsSync(instrPath)) { console.error(`No instruction file for agent '${agent}' at ${instrPath}`); process.exit(2); }

const db = adminClient();
let runId = null;
if (db) {
  const { data } = await db.from("agent_runs")
    .insert({ agent, trigger: process.env.AGENT_TRIGGER || "schedule", status: "running" })
    .select("id").single();
  runId = data?.id ?? null;
}
const finish = async (status, summary, stats = {}) => {
  console.log(`[${agent}] ${status}: ${summary}`);
  if (db && runId) await db.from("agent_runs").update({ status, summary, stats, finished_at: new Date().toISOString() }).eq("id", runId);
};

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { await finish("partial", "skipped: ANTHROPIC_API_KEY not set"); process.exit(0); }

const { table } = targetFor(agent); // throws for non-draft agents (ops/code handled elsewhere)
const system = fs.readFileSync(instrPath, "utf8");

// Light, read-only marketplace context so proposals are grounded (no PII leaves).
let context = "No live database context available.";
if (db) {
  const [{ count: listings }, { count: products }, { count: orgs }] = await Promise.all([
    db.from("livestock_listings").select("id", { count: "exact", head: true }).eq("status", "active"),
    db.from("meat_products").select("id", { count: "exact", head: true }).eq("status", "active"),
    db.from("organizations").select("id", { count: "exact", head: true }),
  ]);
  context = `Marketplace snapshot: ${orgs ?? 0} orgs, ${listings ?? 0} active listings, ${products ?? 0} active beef products.`;
}

const Anthropic = (await import("@anthropic-ai/sdk")).default;
const client = new Anthropic({ apiKey });
const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

const task = [
  context,
  "",
  `Produce up to 15 high-quality proposals as STRICT JSON: {"items": [ ... ]}.`,
  `Each item must be a row for the "${table}" table per your instructions.`,
  "Do not include commentary outside the JSON.",
  "HARD RULE: never fabricate real businesses, people, contacts, listing IDs, reviews, metrics, or activity.",
  "Only reference entities/data present in the context above. If you lack a grounded basis, return {\"items\": []}.",
].join("\n");

let text = "";
try {
  const resp = await client.messages.create({
    model, max_tokens: 4096, system,
    messages: [{ role: "user", content: task }],
  });
  text = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
} catch (e) {
  await finish("failed", `model call failed: ${String(e).slice(0, 160)}`);
  process.exit(1);
}

const items = parseItems(text);
if (!items.length) { await finish("partial", "model returned no parseable proposals"); process.exit(0); }
const rows = prepareRows(agent, items);

if (db) {
  const { error } = await db.from(table).insert(rows);
  if (error) { await finish("failed", `insert into ${table} failed: ${error.message}`); process.exit(1); }
}
await finish("success", `wrote ${rows.length} pending proposal(s) to ${table}`, { count: rows.length, table });
process.exit(0);
