# OpenRange — Autonomous Company Stack

A coordinated, supervised agent ecosystem for an elite livestock-marketplace
operation. The moat is **liquidity + relationships + operational intelligence +
trust** — not "AI." Everything optimizes toward real liquidity, transactions,
retention, and recurring revenue. No fabrication, no spam, no reckless autonomy.

## Command Center
`/admin/agents` is the real-time Command Center: live marketplace **KPIs**
(storefronts, listings, beef, auctions, leads, paid orders, prospects, outreach
sent — all real DB counts), an overall **liquidity score**, a regional
**liquidity heatmap** (priority gaps in red), agent status, the approval queue,
QA findings, recent runs, "was this useful?" feedback, and a **system-wide
kill-switch** (pause/resume the entire stack). Sub-surfaces:
- **Founding Pipeline** `/admin/agents/prospects` — prospect CRM (import/score/dedup/stages/referrals).
- **Outreach Ops** `/admin/agents/outreach` — autonomy arming, send queue/log, suppression, reply classification, response analytics.
- **Memory & Learning** `/admin/agents/memory` — memories, lessons, playbooks, experiments, audit export.

## The 12 commands → what's built
| Command | Implementation |
|---|---|
| 1. Liquidity Commander | `agents/metrics` snapshot + `metrics-core` (score, regional heatmap, acquisition priorities) → `analytics_reports` + `optimization_suggestions`; `daily-liquidity.yml`. KPIs + heatmap on the Command Center. |
| 2. Ranch Acquisition | Founding prospect CRM (`founding_prospects`, scoring/dedup, stages, referrals) + Tier-2 outreach (gated sender, send-safety). |
| 3. Buyer Acquisition | SEO + Content agents (`seo_tasks`, `content_drafts`) — drafts pending approval. |
| 4. Conversion Optimization | Design/UX agent + Ops findings (`optimization_suggestions`, `qa_findings`). |
| 5. Revenue Maximization | Revenue agent (`optimization_suggestions`, area=pricing); founding offer in `docs/growth`. |
| 6. Retention & Success | Customer-Success agent (`optimization_suggestions`, retention); churn signals. |
| 7. Content Domination | Content agent (`content_drafts`) — western voice, no fake claims. |
| 8. SEO Domination | SEO agent (`seo_tasks`) — metadata, internal links, structured-data, blog ideas. |
| 9. Trust & Safety | Trust agent (`moderation_queue`) — flag-only, never auto-ban. |
| 10. Ops / QA | Ops agent (`agents/ops`, live) — routes/forms/mobile/links/auctions → `qa_findings` + screenshots. |
| 11. Analytics & Intelligence | `agents/improve` (weekly self-scoring) + `agents/metrics` (liquidity snapshot) → `analytics_reports`, `agent_performance_metrics`. |
| 12. Memory & Learning | `agent_memories/lessons/decisions/feedback` + `memory-core` (scoped, ranked, secret-free). Every agent loads memory before acting, records a decision, distills lessons. |

## Autonomy tiers (enforced in code + DB)
- **Tier 1 (auto):** discovery, enrichment, scoring, CRM, content/SEO/QA drafting, analytics, recommendations. Safe — no contact.
- **Tier 2 (gated):** low-volume personalized outreach/follow-ups. **Disarmed by default.** Sends only when armed + provider configured + every message clears the send-safety gate (suppression, cooldown, daily cap, dedupe, personalization, spam-risk). Per-agent + system kill-switches.
- **Tier 3 (forbidden):** mass spam, ad spend, fake traction/testimonials/ranches, impersonation, scraping prohibited sources, auto-deploy/delete, bypassing approval. Never built; DB rejects `tier=3`.

## Key metrics (all real counts; rates only when a denominator exists)
active ranches/storefronts · active listings · beef products · auctions · leads ·
paid orders · bids · prospects (by stage) · outreach sent · reply rate ·
activation rate · liquidity score · regional density. Computed by `metrics-core`
from live tables; surfaced on the Command Center and snapshotted daily.

## Liquidity strategy
Focus: **freezer-beef sellers**, then seedstock/cow-calf, then auctions, in
**CO → WY → UT → OK** (priority regions, currently zero inventory). MVP targets:
20 storefronts · 100 listings · 50 beef · 5 auctions. The heatmap surfaces gaps;
the snapshot turns priority gaps into seller-acquisition proposals.

## Scaling phases
1. **10–25 founding ranches** — white-glove onboarding, manual oversight (now).
2. **50–100 ranches** — regional density, referrals.
3. **Regional dominance** — strong DTC beef + auction traction.
4. **National** — enterprise tools, advanced analytics, premium subscriptions.

## Activation (operator)
Apply migrations `0021–0024` to live Supabase; set GitHub/Vercel secrets
(`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
optional `RESEND_API_KEY`/`UPSTASH_*`); merge to the default branch. Then load
real prospects, and arm Tier-2 only after a compliant warmed email domain exists
(`docs/AGENT_AUTONOMY.md`). Until then everything runs read-only / no-ops safely.

## Success (not vanity)
real ranches onboarded · real listings/beef · real transactions · real retention ·
compounding marketplace intelligence · scalable recurring revenue · trusted
reputation.
