# OpenRange — Security Checklist

A living checklist. ✅ = implemented in Phase 1. ☐ = required before/at launch.

## Tenancy & authorization

- ✅ Row Level Security enabled on **every** table; deny-by-default.
- ✅ Tenancy enforced in the database via `is_org_member` / `is_org_admin`
  SECURITY DEFINER helpers (locked `search_path`, no RLS recursion).
- ✅ "Current org" is never trusted from the client — the cookie is a hint that
  is always validated against `organization_members`.
- ✅ Org creation goes through a SECURITY DEFINER RPC (no broad insert policy).
- ✅ Privilege-escalation guard: a trigger blocks non-admins from changing
  `profiles.platform_role`.
- ✅ Cross-tenant isolation is covered by an automated test suite
  (`supabase/tests/rls_isolation_test.sql`).
- ☐ Re-run the RLS suite in CI on every migration change.

## Secrets & configuration

- ✅ No secrets in the repo; `.env*` is git-ignored; `.env.example` documents
  the contract.
- ✅ Server-only secrets are never `NEXT_PUBLIC_`; service-role client is
  `import "server-only"` and used only in trusted code.
- ✅ Env validated with zod (`src/lib/env.ts`); service role guarded against
  browser use.
- ☐ Store production secrets in Vercel/Supabase secret managers; rotate keys
  on a schedule and on staff offboarding.

## Service-role usage (RLS bypass)

- ✅ Limited to trusted boundaries: public chat endpoint, public inquiry &
  contact submissions, and admin moderation — each validates input first.
- ✅ Admin moderation actions are gated by `requirePlatformAdmin()` and
  write an `audit_logs` entry.
- ☐ Audit every new service-role call site in code review.

## Input validation & abuse

- ✅ All mutations validate input with zod at the server boundary.
- ✅ Public chat caps message length and conversation length (durable limit).
- ✅ Honeypot fields on public inquiry & contact forms.
- ✅ **Durable rate limiting** backed by Upstash Redis (`src/lib/ratelimit.ts`)
  on `/api/receptionist/chat`, listing inquiries, and the contact form —
  multi-dimensional (per IP, per org/widget, per user) and covered by tests.
  - Public AI chat: strict per-IP limit + per-org aggregate cap.
  - Authenticated dashboard test panel: generous per-user limit.
  - Inquiry/contact: spam caps generous enough not to block real buyers.
  - **Fail policy:** public endpoints FAIL CLOSED when Redis is unavailable;
    only the authenticated dashboard test panel fails open. (Trade-off: a Redis
    outage briefly blocks public submissions — accepted to prevent abuse. Keep
    Upstash healthy and monitored.)
- ☐ Add CAPTCHA / Turnstile on public forms if spam persists past rate limits.
- ☐ Add Redis health alerting so fail-closed outages are caught fast.

## Billing & entitlements

- ✅ Stripe webhook signature is verified (`constructEvent`) before any
  processing; missing secret → 500, bad/absent signature → 400. Raw body is read
  with `request.text()` (never pre-parsed).
- ✅ Plan access is enforced **server-side only** via entitlement helpers
  (`src/modules/billing/entitlements.ts`); the client is never trusted.
- ✅ A non-active subscription (past_due/canceled/incomplete) is downgraded to
  free, immediately blocking gated features (advanced AI, auctions, unlimited
  listings).
- ✅ Listing publish enforces the active-listing limit server-side.
- ✅ Billing rows are written only by trusted code (checkout action + webhook,
  via the service-role client); RLS still gives members read-only access.
- ✅ Billing events are recorded to `audit_logs`.
- ✅ Stripe secrets are server-only env vars; only the publishable key is
  `NEXT_PUBLIC_`.
- ✅ **Webhook idempotency (atomic)**: every event is tracked in `stripe_events`
  by its Stripe event id. Claiming uses an atomic `INSERT ... ON CONFLICT DO
  NOTHING RETURNING`, so two simultaneous deliveries of a brand-new event can
  never both run the handler — exactly one wins the insert; the other skips.
  Retries of `failed` (or stale `processing`) rows use a conditional
  `UPDATE ... RETURNING` that only one concurrent worker can win. Already-
  processed redeliveries return 200 with nothing re-applied (no duplicate
  subscription writes or audit logs). A stale `processing` row (crashed handler,
  older than 5 min) is safely reclaimed. Covered by unit tests including a
  concurrent-claim race test proving the handler runs exactly once.

## AI safety

- ✅ The receptionist system prompt is assembled server-side from trusted data;
  visitor text is passed only as conversation turns, never as instructions.
- ✅ Prompt includes an instruction-injection guard and "don't invent facts."
- ✅ AI usage/cost is logged to `ai_interactions`.
- ☐ Add per-org spend caps / alerts on AI usage.

## Auth & sessions

- ✅ Supabase Auth (email/password + magic-link callback); cookie session
  refresh via middleware.
- ✅ Protected routes (`/dashboard`, `/onboarding`, `/admin`) gated in
  middleware and re-checked in server code (`requireUser`/`requireOrg`).
- ☐ Enforce a strong password policy and enable leaked-password protection in
  Supabase Auth settings.
- ☐ Consider MFA for platform admins.

## Data & operations

- ✅ Foreign keys with sensible `on delete` behavior; org-scoped cascade.
- ☐ Configure Storage bucket policies before enabling document uploads.
- ☐ Enable Postgres point-in-time recovery / backups.
- ☐ Set security headers (CSP, HSTS) and review CORS for the API route.
- ☐ Run `npm audit` and patch advisories before launch.
