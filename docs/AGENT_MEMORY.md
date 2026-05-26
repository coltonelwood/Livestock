# Agent Memory & Learning

The supervised agents have **persistent, scoped, auditable memory** so they
improve from real outcomes — without uncontrolled self-learning. Agents read
relevant memory before acting and write lessons after; risky changes still need
human approval.

## The learning loop
1. **Retrieve** — before acting, an agent loads global brand rules, its active
   playbook, and the top-ranked relevant memories (`agents/lib/memory.mjs` →
   `retrieveMemories`, ranking/scoping in `memory-core.mjs`).
2. **Act** — produces drafts/findings (always pending approval).
3. **Record** — writes an `agent_decisions` row (what it did + which memory IDs
   informed it = audit of memory used), bumps `last_used_at`.
4. **Learn** — distills `agent_lessons`; repeated patterns reinforce
   (`evidence_count`++, confidence ↑). Recurring Ops failures become
   `bug_pattern` lessons automatically.
5. **Approve** — an admin approves a lesson in **Memory & Learning**; it becomes
   a reusable `successful_tactic`/`failed_tactic` memory. Rejected lessons are
   never reused.
6. **Self-score** — the weekly `improve` agent rolls up runs/findings/feedback/
   approvals into `agent_performance_metrics` + an improvement report.

## Tables (`0022_agent_memory.sql`)
`agent_memories`, `agent_lessons`, `agent_decisions`, `agent_feedback`,
`agent_experiments`, `agent_experiment_results`, `agent_playbooks`,
`agent_preferences`, `agent_knowledge_sources`, `agent_performance_metrics`.
All platform-admin only (RLS); agents write via the service role.

## Scoping (no cross-org leakage)
Every memory has a `scope`: `global | agent | org | user`. The retrieval helper
(and a DB-side pre-filter) guarantee an agent acting for org A **never** sees
org B's private memory, and agent-only memory stays with its agent. Enforced and
unit-tested in `memory-core.mjs` (`scopeVisible`, `selectForContext`).

## Retention & safety
- Rejected / archived memory is never retrieved; expired (`expires_at`) and
  low-confidence (< floor) memory drops out.
- **No secrets are ever stored** — `looksLikeSecret` blocks writes that contain
  API keys, tokens, JWTs, private keys, or `password=`; `redactSecrets` scrubs
  defensively.
- One-off events start at low confidence and only compound with repeated
  evidence + human approval — they don't become "truth" from a single run.
- Agents cannot learn to bypass approval gates: nothing in memory grants the
  ability to send/spend/merge/deploy/delete. Those remain human-only actions.

## Feedback
"Was this useful? 👍/👎" on runs (and memories) writes `agent_feedback` and
nudges the memory's confidence, which shifts future retrieval ranking
(`feedbackBoost` in `memory-core`).

## Playbooks & experiments
- Playbooks are human-owned. Agents may propose a change (`status = pending_update`
  + `pending_changes`); an admin **Approves change** to apply it (bumps version).
- Experiments track hypothesis → result → decision (adopt/reject/retest/needs
  data). Paid experiments (`requires_spend`) cannot start without approval.

## Admin (Control Center → Memory & Learning, `/admin/agents/memory`)
Approve/reject lessons, pin/edit/reject/**delete** memories, reset an agent's
memory (archives, auditable), resolve playbook change requests, decide
experiments, and **Export audit** (`/admin/agents/export` → JSON).

## Run locally
```bash
node agents/improve/run.mjs        # weekly self-improvement report (no API key needed)
node agents/claude/run.mjs content # loads memory+playbook into the prompt, records a decision
```
