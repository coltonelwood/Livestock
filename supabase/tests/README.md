# Database tests

`run-local.sh` spins up a disposable Postgres, applies every migration in
`supabase/migrations/`, and runs `rls_isolation_test.sql` — a cross-tenant
isolation suite that proves the RLS policies actually keep organizations apart.

```bash
supabase/tests/run-local.sh
```

It requires a local Postgres install (the `initdb`/`pg_ctl`/`psql` binaries) but
**no Supabase project** — `_local_auth_stub.sql` stubs the Supabase `auth`
schema and `_local_roles.sql` creates the `anon`/`authenticated` roles.

What the suite verifies:

1. A user sees only orgs they belong to.
2. A user cannot read another org's records.
3. Writes are rejected for orgs the user isn't a member of.
4. Drafts stay private; only `active` listings are publicly readable.
5. `anon` cannot read customers or insert rows.
6. The privilege-escalation trigger blocks self-promotion to `platform_admin`.

> Files prefixed `_local_` are test-only shims and are NEVER applied to a real
> Supabase project (Supabase provides `auth` and the roles for you).
