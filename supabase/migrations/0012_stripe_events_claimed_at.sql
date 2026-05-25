-- 0012 — Add a claim timestamp to the webhook idempotency ledger so a stale
-- "processing" row (from a crashed handler) can be safely reclaimed for retry,
-- while a freshly-claimed event in flight is left alone.

alter table public.stripe_events
  add column if not exists claimed_at timestamptz not null default now();
