-- 0002 — Profiles, organizations, membership, tenancy helpers, and RLS.
-- This migration establishes the multi-tenant foundation. Tenancy is enforced
-- by RLS using SECURITY DEFINER helpers that do NOT recurse through RLS.

-- ── Enums ────────────────────────────────────────────────────────────────────
create type public.business_type as enum (
  'ranch', 'breeder', 'auction_house', 'hauler', 'processor', 'vet_feed_store'
);
create type public.org_role as enum ('owner', 'admin', 'member');
create type public.platform_role as enum ('user', 'platform_admin');

-- ── profiles (1:1 with auth.users) ───────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text,
  email         citext,
  phone         text,
  platform_role public.platform_role not null default 'user',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── organizations ────────────────────────────────────────────────────────────
create table public.organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          citext not null unique,
  business_type public.business_type not null,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- ── organization_members ─────────────────────────────────────────────────────
create table public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  role            public.org_role not null default 'member',
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_idx on public.organization_members (user_id);
create index organization_members_org_idx on public.organization_members (organization_id);

-- ── ranch_profiles (1:1 with org, holds public-facing business info) ──────────
create table public.ranch_profiles (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  display_name    text,
  bio             text,
  location        text,
  website         text,
  phone           text,
  email           citext,
  faq             jsonb not null default '[]'::jsonb,
  is_public       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger ranch_profiles_set_updated_at
  before update on public.ranch_profiles
  for each row execute function public.set_updated_at();

-- ── Tenancy helper functions ─────────────────────────────────────────────────
-- SECURITY DEFINER + locked search_path so they read membership WITHOUT being
-- subject to RLS (this is what prevents infinite policy recursion).
create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.platform_role = 'platform_admin'
  );
$$;

create or replace function public.shares_org(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members a
    join public.organization_members b
      on a.organization_id = b.organization_id
    where a.user_id = auth.uid() and b.user_id = target_user
  );
$$;

-- ── New-user trigger: create a profile row when an auth user is created ───────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Privilege-escalation guard: only platform admins may change platform_role ─
create or replace function public.guard_platform_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.platform_role is distinct from old.platform_role
     and not public.is_platform_admin() then
    raise exception 'not authorized to change platform_role';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_platform_role
  before update on public.profiles
  for each row execute function public.guard_platform_role();

-- ── Atomic org creation RPC (bypasses RLS to seed org + owner membership) ─────
create or replace function public.create_organization(
  p_name text,
  p_slug text,
  p_business_type public.business_type
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
  v_user   uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'must be authenticated';
  end if;

  insert into public.organizations (name, slug, business_type, created_by)
  values (p_name, p_slug, p_business_type, v_user)
  returning id into v_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, v_user, 'owner');

  insert into public.ranch_profiles (organization_id, display_name)
  values (v_org_id, p_name);

  return v_org_id;
end;
$$;

-- ── Enable RLS ────────────────────────────────────────────────────────────────
alter table public.profiles             enable row level security;
alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.ranch_profiles       enable row level security;

-- profiles: see self, co-members, or all (platform admin); update self only.
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid() or public.shares_org(id) or public.is_platform_admin()
  );
create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_platform_admin())
  with check (id = auth.uid() or public.is_platform_admin());

-- organizations: members read; admins update/delete. Inserts go through the RPC.
create policy organizations_select on public.organizations
  for select using (public.is_org_member(id) or public.is_platform_admin());
create policy organizations_update on public.organizations
  for update using (public.is_org_admin(id) or public.is_platform_admin())
  with check (public.is_org_admin(id) or public.is_platform_admin());
create policy organizations_delete on public.organizations
  for delete using (public.is_org_admin(id) or public.is_platform_admin());

-- organization_members: members read; admins manage.
create policy org_members_select on public.organization_members
  for select using (
    public.is_org_member(organization_id) or public.is_platform_admin()
  );
create policy org_members_insert on public.organization_members
  for insert with check (
    public.is_org_admin(organization_id) or public.is_platform_admin()
  );
create policy org_members_update on public.organization_members
  for update using (
    public.is_org_admin(organization_id) or public.is_platform_admin()
  ) with check (
    public.is_org_admin(organization_id) or public.is_platform_admin()
  );
create policy org_members_delete on public.organization_members
  for delete using (
    public.is_org_admin(organization_id) or public.is_platform_admin()
  );

-- ranch_profiles: public rows readable by anyone; members read all of own;
-- admins write.
create policy ranch_profiles_select_public on public.ranch_profiles
  for select using (is_public = true);
create policy ranch_profiles_select_member on public.ranch_profiles
  for select using (
    public.is_org_member(organization_id) or public.is_platform_admin()
  );
create policy ranch_profiles_insert on public.ranch_profiles
  for insert with check (public.is_org_admin(organization_id));
create policy ranch_profiles_update on public.ranch_profiles
  for update using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
