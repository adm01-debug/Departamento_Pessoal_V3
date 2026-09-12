#!/usr/bin/env bash
# Validates the rate-limit recovery migration in disposable PostgreSQL.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260911194000_p0_restore_atomic_rate_limit.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p0-atomic-rate-limit-$$"

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
test -f "$MIGRATION" || { echo "migration not found: $MIGRATION" >&2; exit 1; }

cleanup() {
  [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true
  rm -rf "$RESULT_DIR"
}

RESULT_DIR="$(mktemp -d)"
trap cleanup EXIT

run_psql() {
  if [ "$#" -eq 0 ]; then
    docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1
  else
    docker exec "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"
  fi
}

expect_failure() {
  local database="$1"
  local expected_message="$2"
  local output

  set +e
  output="$(docker exec -i "$NAME" psql -X -U postgres -d "$database" -v ON_ERROR_STOP=1 -f /tmp/p0-rate-limit.sql 2>&1)"
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

docker cp "$MIGRATION" "$NAME":/tmp/p0-rate-limit.sql

run_psql <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE TABLE public.rate_limits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key text NOT NULL,
  "timestamp" bigint NOT NULL
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY no_client_access ON public.rate_limits FOR ALL USING (false) WITH CHECK (false);
SQL

for pass in 1 2; do
  run_psql -f /tmp/p0-rate-limit.sql >/dev/null
  echo "migration pass $pass succeeded"
done

signature="public.edge_rate_limit_check(text, integer, integer, bigint)"
anon_can_execute="$(run_psql -Atc "SELECT has_function_privilege('anon', '$signature', 'EXECUTE')")"
service_can_execute="$(run_psql -Atc "SELECT has_function_privilege('service_role', '$signature', 'EXECUTE')")"
[ "$anon_can_execute" = "f" ] || { echo "anon unexpectedly executes rate-limit RPC" >&2; exit 1; }
[ "$service_can_execute" = "t" ] || { echo "service_role cannot execute rate-limit RPC" >&2; exit 1; }

first="$(run_psql -qAtc "SET ROLE service_role; SELECT public.edge_rate_limit_check('serial', 2, 60, 1000)->>'allowed';")"
second="$(run_psql -qAtc "SET ROLE service_role; SELECT public.edge_rate_limit_check('serial', 2, 60, 1000)->>'allowed';")"
third="$(run_psql -qAtc "SET ROLE service_role; SELECT public.edge_rate_limit_check('serial', 2, 60, 1000)->>'allowed';")"
[ "$first" = "true" ] && [ "$second" = "true" ] && [ "$third" = "false" ] || {
  echo "sequential limit contract failed: $first/$second/$third" >&2; exit 1;
}
reset_at="$(run_psql -qAtc "SET ROLE service_role; SELECT public.edge_rate_limit_check('serial', 2, 60, 1001)->>'reset';")"
[ "$reset_at" = "1060" ] || { echo "rate-limit reset timestamp is wrong: $reset_at" >&2; exit 1; }

# Twenty independent transactions race on the same key. The advisory lock must
# allow exactly three requests, never N+1.
pids=()
for i in $(seq 1 20); do
  docker exec "$NAME" psql -X -qAt -U postgres -v ON_ERROR_STOP=1 -c \
    "SET ROLE service_role; SELECT public.edge_rate_limit_check('concurrent', 3, 60, 2000)->>'allowed';" \
    >"$RESULT_DIR/$i" &
  pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid" || { echo "concurrent rate-limit process failed" >&2; exit 1; }; done
allowed_count="$(grep -h '^true$' "$RESULT_DIR"/* | wc -l | tr -d ' ')"
[ "$allowed_count" = "3" ] || { echo "concurrent limiter allowed $allowed_count requests, expected 3" >&2; exit 1; }

set +e
anon_output="$(run_psql -c "SET ROLE anon; SELECT public.edge_rate_limit_check('blocked', 1, 60, 3000);" 2>&1)"
anon_status=$?
set -e
if [ "$anon_status" -eq 0 ] || [[ "$anon_output" != *'permission denied'* ]]; then
  echo "anon unexpectedly called rate-limit RPC" >&2
  echo "$anon_output" >&2
  exit 1
fi

run_psql -c 'CREATE DATABASE p0_rate_limit_missing_prerequisite' >/dev/null
expect_failure p0_rate_limit_missing_prerequisite 'requires public.rate_limits'

echo 'P0_ATOMIC_RATE_LIMIT_MIGRATION_OK: validated ACL, idempotency, strict input, 20-way concurrency and fail-closed precondition.'
