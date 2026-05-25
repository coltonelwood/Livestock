-- 0004 — Listings: livestock listings, D2C meat products, public inquiries.
-- Active listings are publicly readable (anon). Inquiries are written by a
-- trusted server route (service role); members read them.

create type public.listing_status as enum ('draft', 'active', 'sold', 'archived');
create type public.meat_product_type as enum ('quarter', 'half', 'whole', 'retail_cut', 'bundle', 'other');

-- ── livestock_listings ────────────────────────────────────────────────────────
create table public.livestock_listings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  livestock_id    uuid references public.livestock (id) on delete set null,
  title           text not null,
  description     text,
  species         public.species not null default 'cattle',
  breed           text,
  quantity        int not null default 1,
  price_usd       numeric(12,2),
  location        text,
  seller_name     text,
  photos          jsonb not null default '[]'::jsonb,
  status          public.listing_status not null default 'draft',
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index livestock_listings_org_idx on public.livestock_listings (organization_id);
create index livestock_listings_active_idx on public.livestock_listings (status) where status = 'active';
create trigger livestock_listings_set_updated_at before update on public.livestock_listings
  for each row execute function public.set_updated_at();

-- ── meat_products (direct-to-consumer) ────────────────────────────────────────
create table public.meat_products (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  description     text,
  product_type    public.meat_product_type not null default 'retail_cut',
  price_usd       numeric(12,2),
  unit            text not null default 'each',
  inventory       int,
  photos          jsonb not null default '[]'::jsonb,
  status          public.listing_status not null default 'draft',
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index meat_products_org_idx on public.meat_products (organization_id);
create index meat_products_active_idx on public.meat_products (status) where status = 'active';
create trigger meat_products_set_updated_at before update on public.meat_products
  for each row execute function public.set_updated_at();

-- ── listing_inquiries (public lead capture) ───────────────────────────────────
create table public.listing_inquiries (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  listing_type    text not null check (listing_type in ('livestock', 'meat')),
  listing_id      uuid not null,
  lead_id         uuid references public.leads (id) on delete set null,
  name            text not null,
  email           citext,
  phone           text,
  message         text,
  created_at      timestamptz not null default now()
);
create index listing_inquiries_org_idx on public.listing_inquiries (organization_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.livestock_listings enable row level security;
alter table public.meat_products      enable row level security;
alter table public.listing_inquiries  enable row level security;

-- Public: anyone may read ACTIVE listings/products.
create policy livestock_listings_select_public on public.livestock_listings
  for select using (status = 'active');
create policy meat_products_select_public on public.meat_products
  for select using (status = 'active');

-- Members: full read of own org's listings (incl. drafts) and full write.
do $$
declare t text;
begin
  foreach t in array array['livestock_listings','meat_products']
  loop
    execute format($f$
      create policy %1$s_select_member on public.%1$s
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

-- Inquiries: members read (and may delete/manage); inserts come from the
-- trusted server route using the service role (no anon insert policy by design).
create policy listing_inquiries_select on public.listing_inquiries
  for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy listing_inquiries_delete on public.listing_inquiries
  for delete using (public.is_org_member(organization_id));
