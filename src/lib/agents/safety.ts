/**
 * Hard safety rules for the supervised agent system. These are invariants the
 * whole platform is designed around — agents WRITE drafts/findings only; every
 * risky action is a separate, human-approved step. Surfaced in the Control
 * Center and documented in /agents/SAFETY.md.
 */
export const SAFETY_RULES: string[] = [
  "No agent auto-sends marketing, outreach, or messages to customers.",
  "No agent spends money or launches paid ad campaigns.",
  "No agent deletes production data.",
  "No agent merges PRs or deploys to production.",
  "No agent changes environment variables or secrets.",
  "No agent bans/suspends users or removes content — it only flags into a queue.",
  "No agent scrapes sites that prohibit it; prospects come from approved sources or manual input.",
  "No fabricated testimonials, reviews, engagement, or activity.",
  "No deceptive impersonation of real people.",
  "Every action is logged (agent_runs) and auditable; drafts are reversible.",
] as const;

/** Statuses that mean "a human has signed off". Used by approval UIs/actions. */
export const APPROVED_STATUSES = new Set(["approved", "approved_action", "done"]);

/** A draft/task is actionable by a human only once it reaches one of these. */
export function isApproved(status: string): boolean {
  return APPROVED_STATUSES.has(status);
}

/** Drafts/tasks awaiting a human decision (what the approvals queue shows). */
export const PENDING_STATUSES = new Set(["proposed", "pending_approval", "pending", "open"]);

export function isPending(status: string): boolean {
  return PENDING_STATUSES.has(status);
}
