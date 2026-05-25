-- 0006 — Commerce placeholders (Phase 2/3). Schema + RLS are real so the data
-- model is stable; the application features are intentionally not built yet.

create type public.order_status as enum ('pending', 'paid', 'fulfilled', 'cancelled');
create type public.auction_status as enum ('scheduled', 'live', 'ended', 'cancelled');
create type public.transport_status as enum ('open', 'booked', 'in_transit', 'delivered', 'cancelled');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

-- ── orders (D2C placeholder) ──────────────────────────────────────────────────
create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id     uuid references public.customers (id) on delete set null,
  buyer_email     citext,
  status          public.order_status not null default 'pending',
  total_usd       numeric(12,2),
  items           jsonb not null default '[]'::jsonb,
  stripe_payment_intent text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index orders_org_idx on public.orders (organization_id);
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- ── auctions + bids (placeholder) ─────────────────────────────────────────────
create table public.auctions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  listing_id      uuid references public.livestock_listings (id) on delete set null,
  title           text not null,
  status          public.auction_status not null default 'scheduled',
  starts_at       timestamptz,
  ends_at         timestamptz,
  starting_price_usd numeric(12,2),
  reserve_price_usd  numeric(12,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index auctions_org_idx on public.auctions (organization_id);
create trigger auctions_set_updated_at before update on public.auctions
  for each row execute function public.set_updated_at();

create table public.bids (
  id              uuid primary key default gen_random_uuid(),
  auction_id      uuid not null references public.auctions (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  bidder_id       uuid references public.profiles (id) on delete set null,
  amount_usd      numeric(12,2) not null,
  created_at      timestamptz not null default now()
);
create index bids_auction_idx on public.bids (auction_id, created_at);

-- ── transport_jobs (load board placeholder) ──────────────────────────────────
create table public.transport_jobs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  origin          text,
  destination     text,
  head_count      int,
  species         public.species,
  pickup_date     date,
  status          public.transport_status not null default 'open',
  rate_usd        numeric(12,2),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index transport_jobs_org_idx on public.transport_jobs (organization_id);
create trigger transport_jobs_set_updated_at before update on public.transport_jobs
  for each row execute function public.set_updated_at();

-- ── subscriptions (Stripe-ready placeholder) ─────────────────────────────────
create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null unique references public.organizations (id) on delete cascade,
  plan                   text not null default 'free',
  status                 public.subscription_status not null default 'trialing',
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.orders         enable row level security;
alter table public.auctions       enable row level security;
alter table public.bids           enable row level security;
alter table public.transport_jobs enable row level security;
alter table public.subscriptions  enable row level security;

-- orders + transport_jobs: members read/write within org.
do $$
declare t text;
begin
  foreach t in array array['orders','transport_jobs']
  loop
    execute format($f$
      create policy %1$s_select on public.%1$s
        for select using (public.is_org_member(organization_id) or public.is_platform_admin());
      create policy %1$s_insert on public.%1$s
        for insert with check (public.is_org_member(organization_id));
      create policy %1$s_update on public.%1$s
        for update using (public.is_org_member(organization_id))
        with check (public.is_org_member(organization_id));
      create policy %1$s_delete on public.%1$s
        for delete using (public.is_org_member(organization_id));
    $f$, t);
  end loop;
end $$;

-- auctions: members read; admins manage.
create policy auctions_select on public.auctions
  for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy auctions_insert on public.auctions
  for insert with check (public.is_org_admin(organization_id));
create policy auctions_update on public.auctions
  for update using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy auctions_delete on public.auctions
  for delete using (public.is_org_admin(organization_id));

-- bids: members of the auction's org may read; bids are placed by org members.
create policy bids_select on public.bids
  for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy bids_insert on public.bids
  for insert with check (public.is_org_member(organization_id) and bidder_id = auth.uid());

-- subscriptions: members read; writes happen via service role (Stripe webhooks).
create policy subscriptions_select on public.subscriptions
  for select using (public.is_org_member(organization_id) or public.is_platform_admin());
