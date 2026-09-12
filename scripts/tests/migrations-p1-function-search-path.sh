#!/usr/bin/env bash
# Validates ordinary helper/trigger search_path hardening in disposable PG 17.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260912151000_p1_function_search_path.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p1-function-path-$$"

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
test -f "$MIGRATION" || { echo "migration not found: $MIGRATION" >&2; exit 1; }
cleanup() { [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
psql_run() { docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
for _ in $(seq 1 60); do
  docker exec "$NAME" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$NAME" pg_isready -h 127.0.0.1 -U postgres >/dev/null
docker cp "$MIGRATION" "$NAME":/tmp/p1-function-path.sql

psql_run <<'SQL'
CREATE SCHEMA extensions;
CREATE FUNCTION public.dp_assert_rls(text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
CREATE FUNCTION public.dp_set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE FUNCTION public.dp_soft_delete_trigger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE FUNCTION public.dp_table_template(text) RETURNS text LANGUAGE sql AS $$ SELECT $1 $$;
CREATE FUNCTION public.fill_recrutamento_child_empresa() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE FUNCTION public.fill_treinamento_certificados_empresa() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE FUNCTION public.fill_treinamento_instancias_empresa() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE FUNCTION public.gerar_hash_ponto() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE FUNCTION public.get_personnel_cost_projection(uuid,integer) RETURNS TABLE(mes_ref date,total_estimado numeric) LANGUAGE sql AS $$ SELECT NULL::date,NULL::numeric $$;
SQL

for pass in 1 2; do
  psql_run -f /tmp/p1-function-path.sql >/dev/null
  echo "migration pass $pass succeeded"
done

remaining="$(psql_run -Atc "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname = ANY (ARRAY['dp_assert_rls','dp_set_updated_at','dp_soft_delete_trigger','dp_table_template','fill_recrutamento_child_empresa','fill_treinamento_certificados_empresa','fill_treinamento_instancias_empresa','gerar_hash_ponto','get_personnel_cost_projection']) AND NOT ('search_path=pg_catalog, public, extensions'=ANY(p.proconfig))")"
[ "$remaining" = "0" ] || { echo "ordinary function still has mutable search_path" >&2; exit 1; }

psql_run -c 'CREATE DATABASE p1_function_path_missing_prerequisite' >/dev/null
set +e
failure="$(docker exec -i "$NAME" psql -X -U postgres -d p1_function_path_missing_prerequisite -v ON_ERROR_STOP=1 -f /tmp/p1-function-path.sql 2>&1)"
status=$?
set -e
if [ "$status" -eq 0 ] || [[ "$failure" != *'requires routine'* ]]; then
  echo "migration did not fail closed when routines were missing" >&2
  exit 1
fi

echo 'P1_FUNCTION_SEARCH_PATH_OK: 9 allowlisted routines, idempotency and fail-closed precondition validated.'
