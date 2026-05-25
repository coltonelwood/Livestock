-- 0010 — Track the active Stripe price on the subscription row so the app can
-- map a subscription to a plan tier without calling Stripe on every request.

alter table public.subscriptions
  add column if not exists price_id text;
