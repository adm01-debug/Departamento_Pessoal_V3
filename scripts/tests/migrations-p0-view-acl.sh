#!/usr/bin/env bash
# Reproduces the PUBLIC-grant bypass and validates its P0 forward remediation
# in a disposable PostgreSQL instance. No project data or canonical DB access.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LEGACY_MIGRATION="$REPO_ROOT/supabase/migrations/20260911180000_p0_views_security_invoker.sql"
MIGRATION="$REPO_ROOT/supabase/migrations/20260911192000_p0_views_revoke_public.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p0-view-acl-$$"

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
test -f "$LEGACY_MIGRATION" || { echo "legacy view migration not found: $LEGACY_MIGRATION" >&2; exit 1; }
test -f "$MIGRATION" || { echo "migration not found: $MIGRATION" >&2; exit 1; }

cleanup() {
  [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

run_psql() {
  # `docker exec -i` would consume the here-string that feeds the fixture
  # loop even when psql receives -c. Keep stdin only for heredoc calls.
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
  output="$(docker exec -i "$NAME" psql -X -U postgres -d "$database" -v ON_ERROR_STOP=1 -f /tmp/p0-view-acl.sql 2>&1)"
  local status=$?
  set -e

  if [ "$status" -eq 0 ] || [[ "$output" != *"$expected_message"* ]]; then
    echo "expected fail-closed migration error in $database" >&2
    echo "$output" >&2
    exit 1
  fi
}

view_names="$(sed -nE 's/^ALTER VIEW public\."([^"]+)".*/\1/p' "$LEGACY_MIGRATION")"
view_count="$(printf '%s\n' "$view_names" | sed '/^$/d' | wc -l | tr -d ' ')"
[ "$view_count" = "42" ] || { echo "expected 42 view fixtures, found $view_count" >&2; exit 1; }

echo "Starting disposable $IMAGE database: $NAME"
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null

bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"

docker cp "$LEGACY_MIGRATION" "$NAME":/tmp/p0-view-legacy.sql
docker cp "$MIGRATION" "$NAME":/tmp/p0-view-acl.sql

run_psql <<'SQL'
CREATE ROLE anon NOLOGIN;
SQL

while IFS= read -r view_name; do
  [ -n "$view_name" ] || continue
  run_psql -c "CREATE VIEW public.\"$view_name\" AS SELECT '$view_name'::text AS fixture; GRANT SELECT ON public.\"$view_name\" TO PUBLIC;" >/dev/null
done <<< "$view_names"

# Reproduce the historical faulty state: revoking `anon` does not override
# SELECT inherited through PUBLIC.
run_psql -f /tmp/p0-view-legacy.sql >/dev/null
pre_fix_allowed="$(run_psql -Atc "SELECT has_table_privilege('anon', 'public.vw_colaboradores_completo', 'SELECT')")"
[ "$pre_fix_allowed" = "t" ] || { echo "fixture did not reproduce PUBLIC privilege bypass" >&2; exit 1; }

for pass in 1 2; do
  run_psql -f /tmp/p0-view-acl.sql >/dev/null
  echo "migration pass $pass succeeded"
done

while IFS= read -r view_name; do
  [ -n "$view_name" ] || continue
  allowed="$(run_psql -Atc "SELECT has_table_privilege('anon', 'public.\"$view_name\"', 'SELECT')")"
  [ "$allowed" = "f" ] || { echo "anon retains SELECT through ACL on $view_name" >&2; exit 1; }
  invoker="$(run_psql -Atc "SELECT coalesce('security_invoker=true' = ANY(reloptions), false) FROM pg_class WHERE oid = 'public.\"$view_name\"'::regclass")"
  [ "$invoker" = "t" ] || { echo "security_invoker not active on $view_name" >&2; exit 1; }
done <<< "$view_names"

set +e
anon_output="$(run_psql -c 'SET ROLE anon; SELECT * FROM public.vw_colaboradores_completo;' 2>&1)"
anon_status=$?
set -e
if [ "$anon_status" -eq 0 ] || [[ "$anon_output" != *'permission denied'* ]]; then
  echo "anon unexpectedly read a remediated view" >&2
  echo "$anon_output" >&2
  exit 1
fi

run_psql -c 'CREATE DATABASE p0_view_acl_missing_prerequisite' >/dev/null
expect_failure p0_view_acl_missing_prerequisite 'requires all 42 expected views'

echo 'P0_VIEW_ACL_MIGRATION_OK: reproduced PUBLIC bypass; validated 42 views, invoker mode, ACL denial, idempotency and fail-closed prerequisites.'
