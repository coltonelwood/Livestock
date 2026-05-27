# OpenRange Agent Stack — Activation Runbook

The agent code, DB schema, safety systems, and dashboards are **built, tested,
and deployed**, but the stack is **not yet active on the live project** — the
steps below require credentials only the operator holds (live DB, Vercel env,
DNS). Nothing here can be done from the build sandbox; doing them is what flips
the system from *staged* to *operational*. Until then everything renders
empty-but-safe and all scheduled jobs no-op.

## 1. Apply migrations to the live Supabase project
Apply, in order: `0021_agents.sql`, `0022_agent_memory.sql`,
`0023_founding_prospects.sql`, `0024_outreach_autonomy.sql` (via your normal
migration path, e.g. `supabase db push` or the SQL editor).

## 2. Verify activation (run the exact suite that passes in CI)
```bash
psql "$LIVE_DATABASE_URL" -f supabase/tests/agents_infra_test.sql
# expect: AGENT INFRA: ALL CHECKS PASSED (29 tables, RLS, indexes, seeds, disarmed)
```
This asserts all 29 agent tables exist, RLS is on, key indexes exist, starter
playbooks + brand-rule memories + Tier-2 autonomy rows are seeded, and **no
agent is armed by default.** Also confirm the `media` storage bucket exists.

## 3. Set Vercel env (Production)
Required for full operation (each degrades gracefully if missing):
`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`,
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RESEND_API_KEY`,
Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_*_PRICE_ID`). Confirm only
`NEXT_PUBLIC_*` reach the client.

## 4. GitHub Actions secrets/vars (so the agents run on schedule)
Secrets: `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`, `RESEND_API_KEY`. Variables: `BASE_URL`,
`OPS_REPORT_EMAIL`, `OUTREACH_FROM`. Scheduled workflows run only from the
**default branch**, so merge this branch to activate them.

## 5. Email deliverability (required before arming Tier-2)
Configure a real sending domain: **SPF + DKIM + DMARC**, a valid `From` +
physical mailing address + working unsubscribe. Cold-emailing real ranchers from
an unwarmed/unauthenticated domain damages reputation and risks CAN-SPAM
compliance — do not arm until this is in place.

## 6. Load real prospects
Import via `/admin/agents/prospects` (CSV matching
`docs/growth/prospects-template.csv`, or manual entry, or referrals). Use only
data you're permitted to use. **Never fabricate prospects or scrape prohibited
sources.**

## 7. Arm progressively
- **Tier 1** (Ops, Liquidity, Analytics, Memory, SEO, Content, Conversion) runs
  autonomously once migrations + secrets are set — it only researches, scores,
  drafts, and analyzes. Safe.
- **Tier 2** (Ranch Acquisition, Retention, Buyer outreach): in **Command Center
  → Outreach Ops**, Arm `growth` with a low cap (5–10/day) **only after step 5**.
  Watch bounces/complaints; disarm or hit the **system kill-switch** anytime.
- **Tier 3** is never armable (mass send, ad spend, auto-merge/deploy, billing,
  destructive DB) — structurally blocked.

## Kill-switches
- Per-agent: Command Center agent grid → Pause.
- System-wide: Command Center → **Pause all agents** (`paused:all`).
- Outreach: Outreach Ops → Disarm.
