#!/usr/bin/env bash
# Validates the P0 SECURITY DEFINER search_path migration against a disposable
# PostgreSQL 17 database.  It never connects to the canonical project.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260912150000_p0_secdef_search_path.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p0-secdef-path-$$"

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
docker cp "$MIGRATION" "$NAME":/tmp/p0-secdef-path.sql

psql_run <<'SQL'
CREATE SCHEMA extensions;
CREATE TYPE public.dp_pii_sensitivity AS ENUM ('sensitive');
CREATE TYPE public.dp_user_role AS ENUM ('admin');
CREATE FUNCTION public.dp_audit_log_immutable() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN NEW; END $$;
CREATE FUNCTION public.dp_audit_log_prevent_future() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN NEW; END $$;
CREATE FUNCTION public.dp_catalog_pii(text,text,public.dp_pii_sensitivity,text,text,integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN END $$;
CREATE FUNCTION public.dp_check_log_rotation() RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION public.dp_check_rls_index_coverage() RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT true $$;
CREATE FUNCTION public.dp_connection_health() RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION public.dp_create_next_partition() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN END $$;
CREATE FUNCTION public.dp_decrypt_pii(text,text) RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT $1 $$;
CREATE FUNCTION public.dp_encrypt_pii(text,text) RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT $1 $$;
CREATE FUNCTION public.dp_has_role(public.dp_user_role) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT true $$;
CREATE FUNCTION public.dp_hash_pii(text,text) RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT $1 $$;
CREATE FUNCTION public.dp_missing_indexes() RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT true $$;
CREATE FUNCTION public.dp_post_migration_check(text) RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION public.dp_pre_deploy_gate() RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION public.dp_require_role(public.dp_user_role) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN END $$;
CREATE FUNCTION public.dp_run_retention(uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION public.dp_track_pii_access() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN NEW; END $$;
CREATE FUNCTION public.user_empresa_id() RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT NULL::uuid $$;
SQL

for pass in 1 2; do
  psql_run -f /tmp/p0-secdef-path.sql >/dev/null
  echo "migration pass $pass succeeded"
done

remaining="$(psql_run -Atc "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}'::text[])) cfg WHERE cfg = 'search_path=pg_catalog, public, extensions')")"
[ "$remaining" = "0" ] || { echo "SECURITY DEFINER routine still has mutable search_path" >&2; exit 1; }

psql_run -c 'CREATE DATABASE p0_secdef_missing_prerequisite' >/dev/null
set +e
failure="$(docker exec -i "$NAME" psql -X -U postgres -d p0_secdef_missing_prerequisite -v ON_ERROR_STOP=1 -f /tmp/p0-secdef-path.sql 2>&1)"
status=$?
set -e
if [ "$status" -eq 0 ] || [[ "$failure" != *'requires routine'* ]]; then
  echo "migration did not fail closed when routines were missing" >&2
  exit 1
fi

echo 'P0_SECDEF_SEARCH_PATH_OK: 18 allowlisted routines, idempotency and fail-closed precondition validated.'
