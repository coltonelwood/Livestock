-- Local-only stub of the Supabase-managed `auth` schema, so migrations and RLS
-- can be validated against a plain Postgres. NOT applied to real Supabase.
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);

-- Mirrors Supabase's auth.uid(): reads the request's JWT `sub` claim.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create extension if not exists pgcrypto;
