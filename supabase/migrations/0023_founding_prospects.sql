-- 0023 — Founding Ranch pipeline: a real prospect-intelligence CRM.
--
-- Fuel comes ONLY from human-approved sources (manual entry, uploaded CSVs,
-- referrals, compliant public directories). The system organizes, scores,
-- dedupes, tracks stages, and drafts outreach (pending approval) — it never
-- fabricates prospects, contacts, inventory, or activity, and never scrapes
-- prohibited/behind-login sources. Platform-admin only (RLS).

create table public.prospect_referrers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null default 'rancher'
                check (type in ('rancher','auction','beef_buyer','partner','other')),
  contact     text,
  reward_note text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.founding_prospects (
  id             uuid primary key default gen_random_uuid(),
  business_name  text not null,
  contact_name   text,
  email          text,
  phone          text,
  website        text,
  social_url     text,
  state          text,
  county         text,
  category       text not null default 'ranch'
                   check (category in ('ranch','breeder','beef_seller','auction_house','other')),
  what_they_sell text,
  -- Scoring signals (from the human/source, not invented):
  sells_cattle   boolean not null default false,
  sells_beef     boolean not null default false,
  weak_website   boolean not null default false,
  active_social  boolean not null default false,
  uses_messenger boolean not null default false,  -- leans on Messenger/text/calls for leads
  runs_auctions  boolean not null default false,
  good_photos    boolean not null default false,
  owner_operated boolean not null default false,
  fit_score      int not null default 0,           -- 1..10, computed
  score_breakdown jsonb not null default '{}'::jsonb,
  stage          text not null default 'discovered'
                   check (stage in ('discovered','reviewed','approved','contacted','responded','onboarding','active','inactive')),
  tags           text[] not null default '{}',
  notes          text,
  source         text,                              -- manual | csv | referral | public_directory | ...
  source_url     text,
  referred_by    uuid references public.prospect_referrers (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null, -- set once they sign up
  dedupe_key     text,                              -- normalized name|state for duplicate detection
  created_by     uuid references public.profiles (id) on delete set null,
  last_contacted_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index founding_prospects_stage_idx on public.founding_prospects (stage, fit_score desc);
create index founding_prospects_dedupe_idx on public.founding_prospects (dedupe_key);

-- Stage history = audit + conversion analytics.
create table public.prospect_events (
  id          uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.founding_prospects (id) on delete cascade,
  event_type  text not null,                        -- created | stage_change | note | contacted | responded
  detail      text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index prospect_events_prospect_idx on public.prospect_events (prospect_id, created_at desc);

-- Link outreach drafts to a prospect (drafts still gated in outreach_drafts.status).
alter table public.outreach_drafts add column prospect_id uuid references public.founding_prospects (id) on delete cascade;

create trigger founding_prospects_set_updated_at before update on public.founding_prospects
  for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['prospect_referrers','founding_prospects','prospect_events'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %1$s_admin_all on public.%1$I for all using (public.is_platform_admin()) with check (public.is_platform_admin());',
      t
    );
  end loop;
end $$;
