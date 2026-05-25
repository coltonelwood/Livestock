-- 0011 — Stripe webhook idempotency ledger. One row per Stripe event id; the
-- primary key gives us dedup for free. Written only by the service role (the
-- webhook handler); readable by platform admins.

create table public.stripe_events (
  id              text primary key,            -- Stripe event id (evt_...)
  type            text not null,
  organization_id uuid references public.organizations (id) on delete set null,
  status          text not null default 'processing',  -- processing | processed | failed
  error           text,
  processed_at    timestamptz,
  created_at      timestamptz not null default now()
);

alter table public.stripe_events enable row level security;

create policy stripe_events_select on public.stripe_events
  for select using (public.is_platform_admin());
