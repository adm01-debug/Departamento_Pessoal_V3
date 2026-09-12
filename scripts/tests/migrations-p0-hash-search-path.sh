#!/usr/bin/env bash
# Validates the P0 hash-trigger search_path migration in disposable PostgreSQL.
# Covers the previous production failure, idempotency, and two fail-closed paths.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260911190000_p0_hash_trigger_search_path.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p0-hash-search-path-$$"

required_functions=(
  enforce_afastamento_hash
  enforce_aso_hash
  enforce_batida_ponto_hash
  enforce_cat_hash
  enforce_cnab_remessa_hash
  enforce_desligamento_hash
  enforce_documento_assinatura_hash
  enforce_epi_entrega_hash
  enforce_esocial_evento_hash
  enforce_ferias_hash
  enforce_folha_pagamento_hash
  enforce_holerite_signed_hash
  enforce_medida_disciplinar_hash
)

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
  output="$(docker exec -i "$NAME" psql -X -U postgres -d "$database" -v ON_ERROR_STOP=1 -f /tmp/p0.sql 2>&1)"
  local status=$?
  set -e

  if [ "$status" -eq 0 ]; then
    echo "expected migration to fail in database $database" >&2
    exit 1
  fi
  if [[ "$output" != *"$expected_message"* ]]; then
    echo "unexpected failure in database $database:" >&2
    echo "$output" >&2
    exit 1
  fi
}

echo "Starting disposable $IMAGE database: $NAME"
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null

bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"

docker cp "$MIGRATION" "$NAME":/tmp/p0.sql

run_psql <<'SQL'
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
SQL

for index in "${!required_functions[@]}"; do
  name="${required_functions[$index]}"
  fixture="hash_fixture_$((index + 1))"
  run_psql <<SQL
CREATE TABLE public.$fixture (id integer PRIMARY KEY);
CREATE FUNCTION public.$name() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS \$function\$
BEGIN
  PERFORM digest('integrity-seal', 'sha256');
  RETURN NEW;
END;
\$function\$;
CREATE TRIGGER trg_$fixture BEFORE INSERT ON public.$fixture
FOR EACH ROW EXECUTE FUNCTION public.$name();
SQL
done

set +e
pre_migration_output="$(run_psql -c 'INSERT INTO public.hash_fixture_1 VALUES (1)' 2>&1)"
pre_migration_status=$?
set -e
if [ "$pre_migration_status" -eq 0 ] || [[ "$pre_migration_output" != *"function digest"* ]]; then
  echo "fixture did not reproduce the unqualified digest() failure" >&2
  echo "$pre_migration_output" >&2
  exit 1
fi

for pass in 1 2; do
  run_psql -f /tmp/p0.sql >/dev/null
  echo "migration pass $pass succeeded"
done

invalid_config_count="$(run_psql -Atc "
  SELECT count(*)
  FROM pg_proc AS routine
  JOIN pg_namespace AS routine_schema ON routine_schema.oid = routine.pronamespace
  WHERE routine_schema.nspname = 'public'
    AND routine.proname = ANY (ARRAY['${required_functions[*]// /','}'])
    AND routine.pronargs = 0
    AND routine.prorettype = 'trigger'::regtype
    AND NOT coalesce(routine.proconfig, ARRAY[]::text[]) @> ARRAY['search_path=public, extensions, pg_catalog'];
")"
[ "$invalid_config_count" = "0" ] || { echo "unexpected trigger function configuration" >&2; exit 1; }

for index in "${!required_functions[@]}"; do
  fixture="hash_fixture_$((index + 1))"
  run_psql -c "INSERT INTO public.$fixture VALUES ($((index + 2)))" >/dev/null
done

run_psql -c 'CREATE DATABASE p0_missing_extension' >/dev/null
expect_failure p0_missing_extension 'requires pgcrypto installed in schema extensions'

run_psql -c 'CREATE DATABASE p0_missing_function' >/dev/null
docker exec -i "$NAME" psql -X -U postgres -d p0_missing_function -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
SQL
expect_failure p0_missing_function 'expected 13 public trigger functions'

echo 'P0_HASH_SEARCH_PATH_MIGRATION_OK: reproduced failure; validated 13 trigger functions; idempotent; fail-closed.'
