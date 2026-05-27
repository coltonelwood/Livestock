-- 0025 — Discovery connector system with source governance.
--
-- Scalable prospect discovery from APPROVED/LICENSED/COMPLIANT sources only. A
-- source cannot run unless an admin has approved it, confirmed its terms allow
-- use, and it's within its daily rate limit. Official APIs only (e.g. Google
-- Places) — never scraping search/Maps UIs or behind-login content. Discovery
-- only STAGES prospects ('discovered'); it never contacts anyone. Admin-only RLS.

create table public.discovery_source_policies (
  id            uuid primary key default gen_random_uuid(),
  source_type   text unique not null,                 -- google_places | yelp | directory
  terms_url     text,
  requires_robots_check boolean not null default true,
  allowed_fields text[] not null default '{}',         -- only these fields may be stored
  default_rate_limit int not null default 50,
  allow_extractor boolean not null default false,       -- may pass a result's own website to the single-URL extractor
  notes         text,
  created_at    timestamptz not null default now()
);

create table public.discovery_sources (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  source_type     text not null check (source_type in ('google_places','yelp','directory','csv','manual')),
  enabled         boolean not null default false,
  approved_by_admin boolean not null default false,
  allowed_by_terms  boolean not null default false,
  robots_checked    boolean not null default false,
  rate_limit_per_day int not null default 50,
  enrich_via_extractor boolean not null default false,
  config          jsonb not null default '{}'::jsonb,   -- { queries: [...], regions: [...] }
  last_run_at     timestamptz,
  notes           text,
  created_by      uuid references public.profiles (id) on delete set null,
  approved_by     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.discovery_runs (
  id            uuid primary key default gen_random_uuid(),
  source_id     uuid references public.discovery_sources (id) on delete cascade,
  query         text,
  region        text,
  status        text not null default 'running' check (status in ('running','success','failed','blocked')),
  total_results int not null default 0,
  duplicates_removed int not null default 0,
  staged        int not null default 0,
  high_fit      int not null default 0,
  rejected      int not null default 0,
  error         text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index discovery_runs_source_idx on public.discovery_runs (source_id, started_at desc);

create table public.discovery_results (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid references public.discovery_runs (id) on delete cascade,
  source        text not null,
  source_id     text,                                  -- e.g. Google place_id (attribution)
  business_name text,
  website       text,
  phone         text,
  address       text,
  state         text,
  raw           jsonb not null default '{}'::jsonb,
  confidence    numeric not null default 0,
  fit_score     int,
  included      boolean not null default false,         -- staged as a prospect?
  reason        text,                                   -- inclusion/rejection reason (auditable)
  prospect_id   uuid references public.founding_prospects (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index discovery_results_run_idx on public.discovery_results (run_id);

create trigger discovery_sources_set_updated_at before update on public.discovery_sources
  for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['discovery_source_policies','discovery_sources','discovery_runs','discovery_results'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %1$s_admin_all on public.%1$I for all using (public.is_platform_admin()) with check (public.is_platform_admin());',
      t
    );
  end loop;
end $$;

-- Seed the Google Places policy + a source — DISABLED, UNAPPROVED, terms NOT yet
-- confirmed. The admin must explicitly approve + enable + set GOOGLE_PLACES_API_KEY
-- before it can ever run.
insert into public.discovery_source_policies (source_type, terms_url, requires_robots_check, allowed_fields, default_rate_limit, allow_extractor, notes) values
  ('google_places', 'https://developers.google.com/maps/terms', false,
   array['business_name','website','phone','address','place_id','types','rating'],
   50, true,
   'Official Google Places API only. Never scrape Google search/Maps UI. Display attribution per Google terms.')
on conflict (source_type) do nothing;

insert into public.discovery_sources (name, source_type, enabled, approved_by_admin, allowed_by_terms, rate_limit_per_day, enrich_via_extractor, config, notes) values
  ('Google Places — CO/WY founding ranches', 'google_places', false, false, false, 50, true,
   jsonb_build_object(
     'queries', jsonb_build_array(
       'freezer beef ranch Colorado','Wyoming freezer beef ranch','Utah freezer beef ranch',
       'cattle ranch Colorado','cattle ranch Wyoming','Angus ranch Colorado','Angus ranch Wyoming',
       'livestock auction Colorado','livestock auction Wyoming','beef direct Colorado',
       'local beef ranch Colorado','grass fed beef Colorado'),
     'regions', jsonb_build_array('CO','WY','UT','OK','MT','TX')),
   'Requires GOOGLE_PLACES_API_KEY + admin approval (approved_by_admin, allowed_by_terms, enabled) before running.')
on conflict do nothing;
