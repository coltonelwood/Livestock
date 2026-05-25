-- 0009 — Platform-level demo/contact requests from the marketing site.
-- Not org-scoped. Written by a trusted server action (service role); readable
-- only by platform admins.

create table public.contact_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       citext not null,
  business    text,
  message     text,
  created_at  timestamptz not null default now()
);

alter table public.contact_requests enable row level security;

create policy contact_requests_select on public.contact_requests
  for select using (public.is_platform_admin());
