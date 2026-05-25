-- 0007 — Audit logs. Written by trusted server code (service role); readable by
-- org admins for their own org and by platform admins globally.

create table public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  actor_id        uuid references public.profiles (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete cascade,
  action          text not null,
  entity_type     text,
  entity_id       uuid,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index audit_logs_org_idx on public.audit_logs (organization_id, created_at);

alter table public.audit_logs enable row level security;

create policy audit_logs_select on public.audit_logs
  for select using (
    public.is_platform_admin()
    or (organization_id is not null and public.is_org_admin(organization_id))
  );
