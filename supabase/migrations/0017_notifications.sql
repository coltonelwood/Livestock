-- 0017 — Notifications ledger. Every notification is recorded durably (queued
-- -> sent/failed/skipped) so delivery is auditable even before/without an email
-- provider. Written by trusted server code (service role); readable by platform
-- admins and the owning org's admins.

create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  type            text not null,
  recipient_email citext,
  subject         text,
  status          text not null default 'queued', -- queued | sent | failed | skipped
  error           text,
  payload         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);
create index notifications_org_idx on public.notifications (organization_id, created_at desc);

alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
  for select using (
    public.is_platform_admin()
    or (organization_id is not null and public.is_org_admin(organization_id))
  );
