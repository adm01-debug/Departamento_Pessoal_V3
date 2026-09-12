#!/usr/bin/env bash
# Validates the P0 auth lockout migration using only disposable PostgreSQL data.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260911191000_p0_auth_lockout_contract.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p0-auth-lockout-$$"

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
test -f "$MIGRATION" || { echo "migration not found: $MIGRATION" >&2; exit 1; }

cleanup() {
  [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

run_psql() {
  docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"
}

expect_failure() {
  local database="$1"
  local expected_message="$2"
  local output

  set +e
  output="$(docker exec -i "$NAME" psql -X -U postgres -d "$database" -v ON_ERROR_STOP=1 -f /tmp/p0-auth.sql 2>&1)"
  local status=$?
  set -e

  if [ "$status" -eq 0 ] || [[ "$output" != *"$expected_message"* ]]; then
    echo "expected fail-closed migration error in $database" >&2
    echo "$output" >&2
    exit 1
  fi
}

echo "Starting disposable $IMAGE database: $NAME"
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null

bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"

docker cp "$MIGRATION" "$NAME":/tmp/p0-auth.sql

run_psql <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text NOT NULL,
  success boolean NOT NULL,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.login_lockouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  identifier_type text NOT NULL DEFAULT 'email',
  attempts integer NOT NULL DEFAULT 0,
  is_locked boolean NOT NULL DEFAULT false,
  lockout_until timestamptz,
  last_attempt timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT login_lockouts_identifier_identifier_type_key UNIQUE (identifier, identifier_type)
);
CREATE FUNCTION public.calculate_lockout_duration(attempts integer)
RETURNS interval
LANGUAGE sql
IMMUTABLE
AS $$ SELECT least((2 ^ greatest(0, attempts - 5))::integer * interval '1 minute', interval '60 minutes') $$;
SQL

for pass in 1 2; do
  run_psql -f /tmp/p0-auth.sql >/dev/null
  echo "migration pass $pass succeeded"
done

run_psql <<'SQL' >/dev/null
SET ROLE service_role;
SELECT public.record_login_attempt('ALICE@example.test', false, '203.0.113.1');
SELECT public.record_login_attempt('alice@example.test', false, '203.0.113.1');
SELECT public.record_login_attempt('alice@example.test', false, '203.0.113.1');
SELECT public.record_login_attempt('alice@example.test', false, '203.0.113.1');
RESET ROLE;
SQL

pre_lock="$(run_psql -Atc "SELECT is_locked || ':' || coalesce(locked_until::text, '') FROM public.check_account_lockout('alice@example.test')")"
[ "$pre_lock" = 'false:' ] || { echo "account locked before fifth failure: $pre_lock" >&2; exit 1; }

run_psql <<'SQL' >/dev/null
SET ROLE service_role;
SELECT public.record_login_attempt('alice@example.test', false, '203.0.113.1');
RESET ROLE;
SQL

lock_state="$(run_psql -Atc "SELECT is_locked || ':' || (locked_until > now()) FROM public.check_account_lockout('alice@example.test')")"
[ "$lock_state" = 'true:true' ] || { echo "fifth failure did not produce active lockout: $lock_state" >&2; exit 1; }

run_psql <<'SQL' >/dev/null
UPDATE public.login_lockouts
SET is_locked = false, lockout_until = NULL
WHERE identifier = 'alice@example.test' AND identifier_type = 'email';
SET ROLE service_role;
SELECT public.record_login_attempt('alice@example.test', true, '203.0.113.1');
RESET ROLE;
SQL

attempts_after_success="$(run_psql -Atc "SELECT attempts::text FROM public.login_lockouts WHERE identifier = 'alice@example.test' AND identifier_type = 'email'")"
[ "$attempts_after_success" = '0' ] || { echo "success did not clear lockout attempts" >&2; exit 1; }

set +e
anon_output="$(run_psql -c "SET ROLE anon; SELECT public.record_login_attempt('victim@example.test', false, '203.0.113.2');" 2>&1)"
anon_status=$?
set -e
if [ "$anon_status" -eq 0 ] || [[ "$anon_output" != *'permission denied'* ]]; then
  echo "anon unexpectedly executed a lockout RPC" >&2
  echo "$anon_output" >&2
  exit 1
fi

config_count="$(run_psql -Atc "
  SELECT count(*)
  FROM pg_proc
  WHERE oid IN (
    'public.check_account_lockout(text)'::regprocedure,
    'public.record_login_attempt(text,boolean,text)'::regprocedure
  )
    AND coalesce(proconfig, ARRAY[]::text[]) @> ARRAY['search_path=pg_catalog, public, pg_temp'];
")"
[ "$config_count" = '2' ] || { echo "SECURITY DEFINER search_path is not fixed safely" >&2; exit 1; }

run_psql -c 'CREATE DATABASE p0_auth_missing_prerequisite' >/dev/null
expect_failure p0_auth_missing_prerequisite 'requires public.login_attempts and public.login_lockouts'

echo 'P0_AUTH_LOCKOUT_MIGRATION_OK: 5-attempt lockout, reset, ACL, idempotency, safe search_path and fail-closed prerequisite validated.'
