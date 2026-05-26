# Supervised Agent System — Setup

OpenRange runs a supervised "AI operations team". Agents **propose**; a platform
admin **approves**. Nothing risky happens automatically. Full design + per-agent
instructions live in [`/agents`](../agents/README.md); safety rules in
[`/agents/SAFETY.md`](../agents/SAFETY.md).

## Components
- **Tables** (migration `0021_agents.sql`): `agent_runs`, `agent_tasks`,
  `qa_findings`, `growth_leads`, `outreach_drafts`, `content_drafts`,
  `ad_campaign_drafts`, `analytics_reports`, `seo_tasks`, `moderation_queue`,
  `churn_risks`, `optimization_suggestions`. All platform-admin only (RLS).
- **Ops Agent** (live): `agents/ops/run.mjs` — Playwright QA of the deployed site.
- **Claude agents** (scaffolded): `agents/claude/run.mjs <agent>` — loads
  `agents/<agent>.md` as a system prompt and writes pending drafts.
- **Control Center**: `/admin/agents` — review runs, approve/reject the queue.
- **Workflows**: `.github/workflows/*.yml` (schedules below).

## 1. Apply the migration
The migration is applied with the rest (`supabase/migrations/0021_agents.sql`).
On the live project, run it via your normal migration path. Verify the
`/admin/agents` page loads (it reads the new tables).

## 2. GitHub repo configuration
**Secrets** (Settings → Secrets and variables → Actions → Secrets):
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (service role — CI only, never in the client)
- `ANTHROPIC_API_KEY` (activates all Claude agents; without it they record a
  "skipped" run and stay green)
- `RESEND_API_KEY` (optional — emails the daily Ops report)

**Variables** (… → Variables):
- `BASE_URL` (e.g. `https://livestock-eight.vercel.app`)
- `OPS_REPORT_EMAIL` (optional recipient for the Ops report)

## 3. Schedules
| Workflow | When | Agent |
|---|---|---|
| `hourly-health-check.yml` | hourly | uptime ping (no browser) |
| `daily-qa.yml` | 13:00 UTC | Ops (Playwright QA) |
| `daily-growth.yml` | 13:30 UTC | Growth (outreach templates) |
| `daily-content.yml` | 14:00 UTC | Content |
| `churn-monitor.yml` | 12:00 UTC | Customer Success |
| `trust-safety.yml` | 11:00 UTC | Trust & Safety |
| `weekly-seo.yml` | Mon 15:00 | SEO |
| `weekly-analytics.yml` | Mon 16:00 | Analytics |
| `weekly-site-improvement.yml` | Mon 17:00 | Design / UX |
| `pr-review.yml` | on PR | Code (gates: typecheck/lint/test/build/DB) |

All can be run on demand via **workflow_dispatch**.

## 4. Run locally
```bash
# Ops Agent — QA the deployed site (prints a report; persists if Supabase env set)
BASE_URL=https://livestock-eight.vercel.app node agents/ops/run.mjs

# A Claude agent (needs ANTHROPIC_API_KEY; writes pending drafts to Supabase)
ANTHROPIC_API_KEY=... NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node agents/claude/run.mjs content
```

## 5. Approving work
Open **/admin/agents**. The queue shows proposed tasks, pending outreach/content
drafts, and open QA findings. Approving only flips status — sending an approved
message, opening/merging a PR, or launching a campaign remains a separate,
deliberate human action (see SAFETY.md).

## Cost & safety notes
- Claude agents call the API on schedule; tune cron frequency to your budget.
- The Code Agent's `pr-review.yml` re-runs the full gate on every PR and **never**
  merges or deploys. Keep branch protection on `main` requiring that check.
