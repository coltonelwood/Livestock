-- 0019 — Create a public Storage bucket for item images. On real Supabase the
-- `storage` schema already exists; the local test harness stubs it (see
-- supabase/tests/_local_auth_stub.sql) so this migration applies there too.
--
-- Writes go through a service-role server action (uploadImageAction) that
-- authorizes the caller first, so we don't need per-object write policies; the
-- public bucket makes uploaded images readable via their public URL.

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;
