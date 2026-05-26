# OpenRange — Supervised Agent Operations

A supervised "AI operations team" that continuously improves product quality,
marketplace liquidity, acquisition, retention, and revenue — **without unsafe
autonomy**. Agents propose; humans approve. Nothing risky happens automatically.

## How it works

```
GitHub Actions (schedules)  ─▶  Agent run (Node + Claude API / Playwright)
                                      │ writes
                                      ▼
                          Supabase tables (drafts/findings, all "pending")
                                      │ reads
                                      ▼
                 Admin → Agent Control Center (/admin/agents) → approve / reject
```

- **Logs:** every run is recorded in `agent_runs`; every proposal in its table.
- **Approval gate:** drafts are inserted as `pending_approval` / `proposed` /
  `open`. The Control Center is the only place to advance them, and even
  "approve" never auto-sends/spends/merges — the acting step stays human.
- **Read-only by default:** the Ops Agent only reads the site + DB. The Claude
  agents only write drafts.

## Agents

| Agent | Runs | Output table | Status |
|---|---|---|---|
| Ops | hourly + daily | `qa_findings` | **live** (`agents/ops/run.mjs`) |
| Code | on PR + weekly | `agent_tasks` / PRs | gate live (`pr-review.yml`) |
| Growth | daily | `outreach_drafts` (templates) | scaffolded |
| Content | daily | `content_drafts` | scaffolded |
| Ad Creative | weekly | `ad_campaign_drafts` | scaffolded |
| Analytics | weekly | `analytics_reports` | scaffolded |
| Liquidity | weekly | `optimization_suggestions` | scaffolded |
| SEO | weekly | `seo_tasks` | scaffolded |
| Customer Success | daily | `churn_risks` | scaffolded |
| Revenue | weekly | `optimization_suggestions` | scaffolded |
| Trust & Safety | daily | `moderation_queue` | scaffolded |
| Design / UX | weekly | `optimization_suggestions` | scaffolded |

"Scaffolded" = instruction file + table + workflow are in place; the agent runs
the moment `ANTHROPIC_API_KEY` (and Supabase secrets) are set in the repo.

## Activating (operator)

Set repo **Secrets**: `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, optional `RESEND_API_KEY`. Set repo **Variables**:
`BASE_URL`, `OPS_REPORT_EMAIL`. See `docs/AGENTS.md`.

## Run locally

```bash
node agents/ops/run.mjs                 # full QA against BASE_URL (prints report)
node agents/claude/run.mjs growth       # needs ANTHROPIC_API_KEY; writes pending drafts
```

Read `SAFETY.md` before changing anything here.
