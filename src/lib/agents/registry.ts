import type { AgentName } from "@/lib/db/types";

export type AgentMeta = {
  name: AgentName;
  label: string;
  purpose: string;
  schedule: string;
  /** Whether this agent runs live today, or is scaffolded (instructions + tables
   * + workflow) pending the operator wiring up the Claude Code GitHub Action. */
  status: "live" | "scaffolded";
};

/** The supervised "AI operations team". Every agent is read-only by default and
 * produces drafts/findings/suggestions; risky actions are gated behind approval. */
export const AGENTS: AgentMeta[] = [
  { name: "ops", label: "Ops", purpose: "24/7 QA: route health, forms, mobile, links, console/network errors, auction settlement & order/lead follow-up checks.", schedule: "hourly + daily", status: "live" },
  { name: "code", label: "Code", purpose: "Turns QA findings into GitHub issues, proposes fixes, opens PRs with test evidence. Never merges or deploys.", schedule: "on PR + weekly", status: "scaffolded" },
  { name: "growth", label: "Growth", purpose: "Organizes ranch/breeder/auction prospects from approved sources, drafts personalized outreach. Never auto-sends.", schedule: "daily", status: "scaffolded" },
  { name: "content", label: "Content", purpose: "Drafts western-voice social posts, ranch spotlights, auction highlights, market reports, newsletters.", schedule: "daily", status: "scaffolded" },
  { name: "ad_creative", label: "Ad Creative", purpose: "Drafts ad concepts, hooks, copy, and shot lists for FB/IG/TikTok/Google/YouTube. No auto-spend.", schedule: "weekly", status: "scaffolded" },
  { name: "analytics", label: "Analytics", purpose: "Funnel/listing/retention/auction analysis and weekly executive reports with optimization recommendations.", schedule: "weekly", status: "scaffolded" },
  { name: "liquidity", label: "Liquidity", purpose: "Monitors inventory gaps by breed/region/product; recommends seller-acquisition targets.", schedule: "weekly", status: "scaffolded" },
  { name: "seo", label: "SEO", purpose: "Metadata, internal linking, keyword opportunities, indexing health — useful, non-spammy.", schedule: "weekly", status: "scaffolded" },
  { name: "customer_success", label: "Customer Success", purpose: "Flags inactive sellers / abandoned listings; drafts re-engagement (approval required).", schedule: "daily", status: "scaffolded" },
  { name: "revenue", label: "Revenue", purpose: "Monetization, pricing, upsell, featured-listing and subscription-conversion ideas.", schedule: "weekly", status: "scaffolded" },
  { name: "trust_safety", label: "Trust & Safety", purpose: "Flags suspicious/spam/duplicate listings & accounts into a moderation queue. Never auto-bans.", schedule: "daily", status: "scaffolded" },
  { name: "design_ux", label: "Design / UX", purpose: "Audits mobile UX, onboarding friction, visual consistency, trust; proposes UI improvements.", schedule: "weekly", status: "scaffolded" },
  { name: "improve", label: "Self-Improvement", purpose: "Weekly self-scoring: aggregates runs/findings/feedback/approvals into an improvement report (no LLM, no fabrication).", schedule: "weekly", status: "live" },
];

export function agentLabel(name: string): string {
  return AGENTS.find((a) => a.name === name)?.label ?? name;
}
