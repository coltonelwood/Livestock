# Ops Agent

The Ops Agent is implemented as code: `agents/ops/run.mjs` (run by
`.github/workflows/daily-qa.yml` and `hourly-health-check.yml`). It is the one
agent that runs fully today.

## What it does (read-only)
- Route health for public + auth-gated pages (public must be 200; dashboard must
  redirect, never 500).
- Console + network error capture per page.
- Mobile horizontal-overflow checks (360px, 768px).
- Broken-link scan across the homepage's internal links.
- Form smoke test: submits a listing inquiry and expects the success confirmation.
- DB checks (when service-role env is set): auctions past `ends_at` still `live`,
  orders stuck in `pending_payment` >24h, `new` leads un-actioned >3 days.
- Screenshots on failure (uploaded as a workflow artifact).

## What it produces
- One `agent_runs` row per run; one `qa_findings` row per issue (severity-ranked).
- A markdown report (printed, optionally emailed via Resend).
- Non-zero exit on any critical/high finding so CI surfaces a regression.

## What it never does
- No mutations, no messages, no deploys. Findings become GitHub issues only via
  the human-reviewed Code Agent / Control Center.
