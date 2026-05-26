# Agent Safety Rules (non-negotiable)

This is **not** an uncontrolled autonomous swarm. Every agent obeys these rules,
which are enforced in three layers: the database (status columns + RLS), the app
(approval-only actions), and the workflows (read-only / draft-only, no deploy).

## No agent may
- Auto-send marketing, outreach, DMs, or any message to a customer.
- Spend money or launch paid ad campaigns.
- Delete production data.
- Merge PRs or deploy to production.
- Change environment variables or secrets.
- Ban/suspend users or remove content — it only flags into `moderation_queue`.
- Scrape sites that prohibit it. Prospects come from approved sources / manual input.
- Fabricate testimonials, reviews, engagement, metrics, or activity.
- Deceptively impersonate a real human.
- Bypass RLS or any security control.

## Every action must
- Be logged in `agent_runs` (and the relevant draft/finding table).
- Be reversible where possible (drafts can be rejected/deleted before any effect).
- Have an audit trail (who approved, when).

## Approval model
Agents write rows in an inert state:
`proposed` (tasks/seo/optimization), `pending_approval` (outreach/content/ads),
`open` (findings/churn), `pending` (moderation), `new` (leads).

A **platform admin** advances them in the Agent Control Center (`/admin/agents`).
"Approve" only changes status — the side-effecting step (sending an approved
email, opening/merging a PR, launching a campaign) is always a separate,
deliberate human action. If you add such a step, it must itself check for an
`approved` status and be triggered by a human, never by a schedule.
