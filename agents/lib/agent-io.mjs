// Pure mapping/parsing for the generic Claude agent runner — unit-tested.
// Each draft-producing agent writes to ONE table, always in a non-acting,
// pending/proposed state so a human must approve before anything happens.

// Growth drafts reusable OUTREACH TEMPLATES (it must never invent real
// prospects — those are entered manually/from approved sources into
// growth_leads). Data-bound agents (analytics/trust_safety) only emit rows when
// the runner gives them grounded context; otherwise they return [] (no fabrication).
export const TARGET = {
  growth:           { table: "outreach_drafts",           status: "pending_approval" },
  content:          { table: "content_drafts",            status: "pending_approval" },
  ad_creative:      { table: "ad_campaign_drafts",        status: "pending_approval" },
  seo:              { table: "seo_tasks",                  status: "proposed" },
  analytics:        { table: "analytics_reports",          status: null },
  liquidity:        { table: "optimization_suggestions",   status: "proposed" },
  revenue:          { table: "optimization_suggestions",   status: "proposed" },
  design_ux:        { table: "optimization_suggestions",   status: "proposed" },
  customer_success: { table: "optimization_suggestions",   status: "proposed" },
  trust_safety:     { table: "moderation_queue",           status: "pending" },
  code:             { table: "agent_tasks",                status: "proposed" },
};

const STAMP_AGENT = new Set(["liquidity", "revenue", "design_ux", "customer_success", "code"]);

export function targetFor(agent) {
  const t = TARGET[agent];
  if (!t) throw new Error(`Unknown or non-draft agent: ${agent}`);
  return t;
}

/** Extract the JSON object the model returns (tolerates ```json fences / prose). */
export function parseItems(text) {
  if (!text) return [];
  let body = text.trim();
  const fence = body.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) body = fence[1].trim();
  // Fall back to the first {...} block.
  if (!body.startsWith("{") && !body.startsWith("[")) {
    const obj = body.match(/\{[\s\S]*\}/);
    if (obj) body = obj[0];
  }
  let parsed;
  try { parsed = JSON.parse(body); } catch { return []; }
  const items = Array.isArray(parsed) ? parsed : parsed.items;
  return Array.isArray(items) ? items : [];
}

/** Stamp each item with the agent + its safe default status before insert. */
export function prepareRows(agent, items, max = 25) {
  const { status } = targetFor(agent);
  const rows = items.slice(0, max).map((it) => {
    const row = { ...it };
    if (status && !row.status) row.status = status;
    if (!("agent" in row) && STAMP_AGENT.has(agent)) row.agent = agent;
    return row;
  });
  return rows;
}
