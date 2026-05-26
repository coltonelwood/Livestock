// Pure memory logic for the agent learning loop — no I/O, fully unit-tested.
// This is the safety spine: scoping (no cross-org leakage), retention (expired /
// rejected / low-confidence drop out), feedback-weighted ranking, and a secret
// detector so credentials are never written to memory.

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/,                 // OpenAI/Anthropic-style keys
  /\bsk-ant-[A-Za-z0-9_-]{16,}\b/,
  /\bsbp_[A-Za-z0-9]{20,}\b/,                  // Supabase access tokens
  /\bAKIA[0-9A-Z]{16}\b/,                      // AWS access key id
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,            // GitHub tokens
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,          // Slack tokens
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/, // JWT
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bBearer\s+[A-Za-z0-9._-]{20,}\b/i,
  /\b(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*\S{6,}/i,
];

export function looksLikeSecret(text) {
  if (!text) return false;
  return SECRET_PATTERNS.some((re) => re.test(String(text)));
}

/** Replace anything that looks like a credential with a marker. */
export function redactSecrets(text) {
  if (!text) return text;
  let out = String(text);
  for (const re of SECRET_PATTERNS) out = out.replace(new RegExp(re, re.flags.includes("g") ? re.flags : re.flags + "g"), "[redacted]");
  return out;
}

export function isExpired(memory, now = Date.now()) {
  if (!memory.expires_at) return false;
  return new Date(memory.expires_at).getTime() <= now;
}

/** A memory is usable only if it's active (not pending/rejected/archived), not
 * expired, and clears the confidence floor. Rejected memory is never reused. */
export function isRetrievable(memory, now = Date.now(), minConfidence = 0.25) {
  if (memory.status !== "active") return false;
  if (isExpired(memory, now)) return false;
  if ((memory.confidence_score ?? 0) < minConfidence) return false;
  return true;
}

/** Scope visibility — the core anti-leak rule. An agent acting in some context
 * can only see global memory, its own agent memory, its own org's memory, or
 * its own user's memory. Org A never sees org B's private memory. */
export function scopeVisible(memory, ctx = {}) {
  switch (memory.scope) {
    case "global": return true;
    case "agent":  return !!ctx.agent && (memory.agent == null || memory.agent === ctx.agent);
    case "org":    return !!ctx.organizationId && memory.organization_id === ctx.organizationId;
    case "user":   return !!ctx.userId && memory.user_id === ctx.userId;
    default:       return false;
  }
}

function recencyBoost(memory, now) {
  const ts = new Date(memory.last_used_at || memory.created_at || now).getTime();
  const ageDays = Math.max(0, (now - ts) / 86_400_000);
  return Math.max(0, 0.3 - ageDays * 0.01); // fresh memories get up to +0.3, fading over ~30d
}

/** Net human feedback signal for a memory (+useful / −not_useful), if provided. */
function feedbackBoost(memory) {
  const f = memory.feedback ?? { useful: 0, not_useful: 0 };
  return Math.max(-0.5, Math.min(0.5, ((f.useful ?? 0) - (f.not_useful ?? 0)) * 0.1));
}

export function scoreMemory(memory, now = Date.now()) {
  return (
    (memory.confidence_score ?? 0) +
    (memory.pinned ? 0.5 : 0) +
    recencyBoost(memory, now) +
    feedbackBoost(memory)
  );
}

export function rankMemories(memories, now = Date.now()) {
  return [...memories].sort((a, b) => scoreMemory(b, now) - scoreMemory(a, now));
}

/**
 * Select the memories an agent should see for a run: filter by retention +
 * scope, rank, cap. Returns the ranked list plus tactic splits the prompt uses.
 */
export function selectForContext(memories, ctx = {}, opts = {}) {
  const now = opts.now ?? Date.now();
  const limit = opts.limit ?? 20;
  const usable = memories.filter((m) => isRetrievable(m, now, opts.minConfidence) && scopeVisible(m, ctx));
  const ranked = rankMemories(usable, now).slice(0, limit);
  return {
    memories: ranked,
    brandRules: ranked.filter((m) => m.memory_type === "brand_rule"),
    failedTactics: ranked.filter((m) => m.memory_type === "failed_tactic"),
    successfulTactics: ranked.filter((m) => m.memory_type === "successful_tactic"),
  };
}

/** Render a compact memory block for an LLM system/task prompt. */
export function buildPromptContext({ memories, brandRules, failedTactics, successfulTactics }, extras = {}) {
  const lines = [];
  if (brandRules.length) {
    lines.push("BRAND RULES (always obey):");
    for (const m of brandRules) lines.push(`- ${m.summary}`);
  }
  if (extras.playbook) {
    lines.push("", `ACTIVE PLAYBOOK — ${extras.playbook.title}:`, extras.playbook.steps || "");
    if (extras.playbook.disallowed_tactics?.length) lines.push(`Disallowed: ${extras.playbook.disallowed_tactics.join("; ")}`);
  }
  if (successfulTactics.length) {
    lines.push("", "REUSE what has worked:");
    for (const m of successfulTactics) lines.push(`- ${m.summary}`);
  }
  if (failedTactics.length) {
    lines.push("", "AVOID what has failed:");
    for (const m of failedTactics) lines.push(`- ${m.summary}`);
  }
  const other = memories.filter((m) => !["brand_rule", "successful_tactic", "failed_tactic"].includes(m.memory_type));
  if (other.length) {
    lines.push("", "RELEVANT MEMORY:");
    for (const m of other.slice(0, 10)) lines.push(`- [${m.memory_type}] ${m.summary}`);
  }
  if (extras.preferences?.length) {
    lines.push("", "PREFERENCES:");
    for (const p of extras.preferences) lines.push(`- ${p.key}: ${p.value}`);
  }
  return lines.join("\n").trim();
}
