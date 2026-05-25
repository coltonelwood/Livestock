-- 0001 — Extensions and shared helpers
-- Foundational pieces used by every later migration.

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "citext";         -- case-insensitive emails

-- Generic updated_at maintainer. Attached to each table with an updated_at col.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
