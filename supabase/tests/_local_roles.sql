-- Local-only Supabase-style roles. On real Supabase these already exist with
-- the correct grants. RLS does NOT apply to superusers/table owners, so tests
-- must run as `anon` / `authenticated`.
do $$ begin
  if not exists (select from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;

grant usage on schema public, auth to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated;
grant execute on all functions in schema auth to anon, authenticated;

-- Let the test session assume these roles.
grant anon, authenticated to current_user;
