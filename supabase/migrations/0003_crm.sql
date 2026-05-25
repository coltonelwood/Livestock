-- 0003 — CRM: customers, leads, notes, livestock, reminders, documents.
-- Org members may read and write records within their own organization.

-- ── Enums ────────────────────────────────────────────────────────────────────
create type public.lead_status as enum ('new', 'contacted', 'qualified', 'won', 'lost');
create type public.lead_source as enum ('web_chat', 'listing_inquiry', 'manual', 'import');
create type public.species as enum ('cattle', 'sheep', 'goat', 'horse', 'swine', 'poultry', 'other');
create type public.reminder_status as enum ('pending', 'done', 'cancelled');

-- ── customers ─────────────────────────────────────────────────────────────────
create table public.customers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  email           citext,
  phone           text,
  address         text,
  tags            text[] not null default '{}',
  notes           text,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index customers_org_idx on public.customers (organization_id);
create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- ── leads ─────────────────────────────────────────────────────────────────────
-- conversation_id is a soft link (the receptionist module creates conversations
-- in a later migration); no hard FK to keep the lead/conversation lifecycle
-- decoupled.
create table public.leads (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id     uuid references public.customers (id) on delete set null,
  conversation_id uuid,
  source          public.lead_source not null default 'manual',
  status          public.lead_status not null default 'new',
  name            text,
  email           citext,
  phone           text,
  summary         text,
  score           int,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index leads_org_idx on public.leads (organization_id);
create index leads_status_idx on public.leads (organization_id, status);
create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- ── notes (polymorphic: customer, lead, livestock, listing, ...) ──────────────
create table public.notes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  entity_type     text not null,
  entity_id       uuid not null,
  body            text not null,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index notes_entity_idx on public.notes (organization_id, entity_type, entity_id);
create trigger notes_set_updated_at before update on public.notes
  for each row execute function public.set_updated_at();

-- ── livestock (animal records) ────────────────────────────────────────────────
create table public.livestock (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  tag             text,
  name            text,
  species         public.species not null default 'cattle',
  breed           text,
  sex             text,
  birth_date      date,
  weight_lbs      numeric(8,2),
  status          text not null default 'active',
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index livestock_org_idx on public.livestock (organization_id);
create trigger livestock_set_updated_at before update on public.livestock
  for each row execute function public.set_updated_at();

-- ── reminders ─────────────────────────────────────────────────────────────────
create table public.reminders (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title           text not null,
  body            text,
  due_at          timestamptz not null,
  status          public.reminder_status not null default 'pending',
  entity_type     text,
  entity_id       uuid,
  assigned_to     uuid references public.profiles (id) on delete set null,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index reminders_org_due_idx on public.reminders (organization_id, due_at);
create trigger reminders_set_updated_at before update on public.reminders
  for each row execute function public.set_updated_at();

-- ── documents (metadata for Supabase Storage objects) ─────────────────────────
create table public.documents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  storage_path    text not null,
  mime_type       text,
  size_bytes      bigint,
  entity_type     text,
  entity_id       uuid,
  uploaded_by     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index documents_entity_idx on public.documents (organization_id, entity_type, entity_id);

-- ── RLS: org members may read + write within their org ────────────────────────
alter table public.customers enable row level security;
alter table public.leads     enable row level security;
alter table public.notes     enable row level security;
alter table public.livestock enable row level security;
alter table public.reminders enable row level security;
alter table public.documents enable row level security;

do $$
declare t text;
begin
  foreach t in array array['customers','leads','notes','livestock','reminders','documents']
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
