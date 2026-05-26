// Memory I/O for agent scripts. Thin layer over Supabase that delegates all
// filtering/scoping/ranking to memory-core, and refuses to persist secrets.
import { looksLikeSecret, redactSecrets, selectForContext } from "./memory-core.mjs";

/**
 * Retrieve + rank the memories an agent should see for a run.
 * ctx: { agent, organizationId?, userId? }. Pulls a broad candidate set (active,
 * in-scope-ish) then applies the pure retention/scope/rank rules.
 */
export async function retrieveMemories(db, ctx, opts = {}) {
  if (!db) return selectForContext([], ctx, opts);
  // Candidates: global + this agent's, active only. (Org/user scope further
  // filtered in-memory by memory-core so we never over-fetch other orgs.)
  let q = db.from("agent_memories").select("*").eq("status", "active").limit(200);
  const { data } = await q;
  let rows = data ?? [];
  // Hard DB-side guard against cross-org leakage: drop org/user-scoped rows that
  // don't match this context before they ever reach ranking.
  rows = rows.filter((m) => {
    if (m.scope === "org") return ctx.organizationId && m.organization_id === ctx.organizationId;
    if (m.scope === "user") return ctx.userId && m.user_id === ctx.userId;
    if (m.scope === "agent") return m.agent == null || m.agent === ctx.agent;
    return true; // global
  });
  return selectForContext(rows, ctx, opts);
}

/** Mark which memories informed a run (audit of memory used) + bump last_used_at. */
export async function touchMemories(db, ids) {
  if (!db || !ids?.length) return;
  await db.from("agent_memories").update({ last_used_at: new Date().toISOString() }).in("id", ids);
}

/**
 * Write a memory — REFUSES to store secrets, redacts the rest defensively.
 * Agent-written memories are 'active' but low-confidence; admins can pin/approve.
 */
export async function recordMemory(db, mem) {
  if (looksLikeSecret(mem.summary) || looksLikeSecret(mem.detail)) {
    return { skipped: "secret_detected" };
  }
  if (!db) return { skipped: "no_db" };
  const row = {
    agent: mem.agent ?? null,
    memory_type: mem.memory_type,
    summary: redactSecrets(mem.summary),
    detail: mem.detail ? redactSecrets(mem.detail) : null,
    source: mem.source ?? null,
    confidence_score: mem.confidence_score ?? 0.4,
    related_entity_type: mem.related_entity_type ?? null,
    related_entity_id: mem.related_entity_id ?? null,
    tags: mem.tags ?? [],
    scope: mem.scope ?? "global",
    organization_id: mem.organization_id ?? null,
    user_id: mem.user_id ?? null,
    status: "active",
    expires_at: mem.expires_at ?? null,
  };
  const { data, error } = await db.from("agent_memories").insert(row).select("id").single();
  return error ? { error: error.message } : { id: data?.id };
}

/** Record/strengthen a lesson. If a matching lesson exists, bump evidence_count
 * + confidence instead of duplicating (so repeated patterns compound). */
export async function recordLesson(db, { agent, category, lesson, tags = [] }) {
  if (looksLikeSecret(lesson)) return { skipped: "secret_detected" };
  if (!db) return { skipped: "no_db" };
  const { data: existing } = await db.from("agent_lessons")
    .select("id, evidence_count, confidence_score")
    .eq("agent", agent).eq("lesson", lesson).maybeSingle();
  if (existing) {
    const next = Math.min(1, (existing.confidence_score ?? 0.4) + 0.1);
    await db.from("agent_lessons").update({
      evidence_count: (existing.evidence_count ?? 1) + 1, confidence_score: next,
    }).eq("id", existing.id);
    return { id: existing.id, reinforced: true };
  }
  const { data } = await db.from("agent_lessons")
    .insert({ agent, category, lesson: redactSecrets(lesson), tags, status: "proposed" })
    .select("id").single();
  return { id: data?.id };
}

/** Log what the agent decided + which memories informed it (audit trail). */
export async function recordDecision(db, { runId, agent, action, rationale, memoryIds = [], expectedOutcome, riskLevel = "low", confidence = 0.5 }) {
  if (!db) return;
  await db.from("agent_decisions").insert({
    run_id: runId ?? null, agent, action, rationale: rationale ? redactSecrets(rationale) : null,
    memory_ids: memoryIds, expected_outcome: expectedOutcome ?? null, risk_level: riskLevel, confidence_score: confidence,
  });
}

export async function recordMetric(db, { agent, period, metric, value, detail = {} }) {
  if (!db) return;
  await db.from("agent_performance_metrics").insert({ agent, period, metric, value, detail });
}

/** Load the active playbook for a slug (for prompt grounding). */
export async function loadPlaybook(db, slug) {
  if (!db) return null;
  const { data } = await db.from("agent_playbooks").select("*").eq("slug", slug).eq("status", "active").maybeSingle();
  return data ?? null;
}
