#!/usr/bin/env bash
# Spin up a throwaway Postgres, apply all migrations, and run the RLS isolation
# suite. Self-contained: no Supabase project required. Validates migration
# ordering, SQL syntax, and that tenant isolation policies actually hold.
#
# Usage: supabase/tests/run-local.sh
set -euo pipefail

PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -n "$PGBIN" ] || { echo "Postgres binaries not found; set PGBIN"; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIG="$ROOT/supabase/migrations"
TESTS="$ROOT/supabase/tests"

WORK="$(mktemp -d)"
PGDATA="$WORK/data"
SOCK="$WORK/sock"
PORT="${PGPORT:-54399}"
DB="openrange_test"

# Postgres refuses to run as root; fall back to the system `postgres` user.
RUNAS=""
if [ "$(id -u)" = "0" ]; then
  RUNAS="postgres"
  chown -R postgres:postgres "$WORK"
fi
as() { if [ -n "$RUNAS" ]; then su "$RUNAS" -c "$1"; else bash -c "$1"; fi; }
mkdir -p "$SOCK"; [ -n "$RUNAS" ] && chown "$RUNAS" "$SOCK" || true

cleanup() { as "$PGBIN/pg_ctl -D $PGDATA stop -m immediate" >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

as "$PGBIN/initdb -D $PGDATA -U postgres --auth=trust" >/dev/null
as "$PGBIN/pg_ctl -D $PGDATA -o '-p $PORT -k $SOCK -c listen_addresses=\"\"' -w start" >/dev/null
as "$PGBIN/createdb -h $SOCK -p $PORT -U postgres $DB"

psql() { as "$PGBIN/psql -v ON_ERROR_STOP=1 -h $SOCK -p $PORT -U postgres -d $DB -f $1"; }

psql "$TESTS/_local_auth_stub.sql" >/dev/null
for f in "$MIG"/*.sql; do echo "applying $(basename "$f")"; psql "$f" >/dev/null; done
psql "$TESTS/_local_roles.sql" >/dev/null

echo "--- RLS isolation suite ---"
psql "$TESTS/rls_isolation_test.sql" | grep -E "PASSED|FAIL" || { echo "SUITE FAILED"; exit 1; }
