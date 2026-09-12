#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260912195000_p1_scoped_audit_trail.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p1-audit-trail-$$"

cleanup() { [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
run_psql() { docker exec "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }
expect_denied() {
  local output status
  set +e
  output="$(run_psql -c "$1" 2>&1)"; status=$?
  set -e
  [ "$status" -ne 0 ] && [[ "$output" == *"permission denied"* || "$output" == *"restricted"* || "$output" == *"authentication required"* ]] || {
    echo "expected permission denial" >&2; echo "$output" >&2; exit 1;
  }
}

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
for _ in $(seq 1 60); do docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
docker cp "$MIGRATION" "$NAME":/tmp/migration.sql

docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT (COALESCE(NULLIF(current_setting('request.jwt.claims',true),''),'{}')::jsonb->>'sub')::uuid $$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
$$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;

CREATE TABLE public.user_empresas(user_id uuid, empresa_id uuid, PRIMARY KEY(user_id,empresa_id));
CREATE TABLE public.user_roles(user_id uuid, role text, PRIMARY KEY(user_id,role));
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='admin') $$;
CREATE OR REPLACE FUNCTION public.pode_gerir_rh(_empresa_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_empresas ue JOIN public.user_roles ur USING(user_id) WHERE ue.user_id=auth.uid() AND ue.empresa_id=_empresa_id AND ur.role IN ('rh','admin')) $$;

CREATE TABLE public.profiles(id uuid PRIMARY KEY, user_id uuid UNIQUE NOT NULL, nome text NOT NULL);
CREATE TABLE public.audit_log(
  id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(), tabela text NOT NULL,
  registro_id text NOT NULL, acao text NOT NULL, user_id uuid, user_email text,
  dados_anteriores jsonb, dados_novos jsonb
);
CREATE VIEW public.v_audit_trail AS SELECT * FROM public.audit_log;
GRANT SELECT ON public.v_audit_trail TO authenticated;

INSERT INTO public.user_empresas VALUES
('00000000-0000-0000-0000-000000000001','10000000-0000-4000-8000-000000000001'),
('00000000-0000-0000-0000-000000000002','20000000-0000-4000-8000-000000000002');
INSERT INTO public.user_roles VALUES
('00000000-0000-0000-0000-000000000001','rh'),
('00000000-0000-0000-0000-000000000002','colaborador'),
('00000000-0000-0000-0000-000000000099','admin');
INSERT INTO public.profiles VALUES
('90000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000001','RH T1');
INSERT INTO public.audit_log VALUES
('30000000-0000-4000-8000-000000000001',now()-interval '2 minute','folha','r1','UPDATE','00000000-0000-0000-0000-000000000001','rh@example.test',NULL,'{"empresa_id":"10000000-0000-4000-8000-000000000001","status":"fechada"}'),
('30000000-0000-4000-8000-000000000002',now()-interval '1 minute','folha','r2','UPDATE','00000000-0000-0000-0000-000000000002','user@example.test',NULL,'{"empresa_id":"20000000-0000-4000-8000-000000000002","status":"aberta"}'),
('30000000-0000-4000-8000-000000000003',now(),'misc','r3','UPDATE',NULL,NULL,NULL,'{"empresa_id":"not-a-uuid"}');
SQL

for pass in 1 2; do run_psql -f /tmp/migration.sql >/dev/null; done

rh_count="$(run_psql -qAtc "SET ROLE authenticated; SET request.jwt.claims='{\"sub\":\"00000000-0000-0000-0000-000000000001\",\"role\":\"authenticated\"}'; SELECT count(*) FROM public.get_audit_trail('10000000-0000-4000-8000-000000000001');")"
[ "$rh_count" = "1" ] || { echo "RH tenant scope failed: $rh_count" >&2; exit 1; }

expect_denied "SET ROLE authenticated; SET request.jwt.claims='{\"sub\":\"00000000-0000-0000-0000-000000000002\",\"role\":\"authenticated\"}'; SELECT * FROM public.get_audit_trail('10000000-0000-4000-8000-000000000001');"
expect_denied "SET ROLE anon; SELECT * FROM public.get_audit_trail('10000000-0000-4000-8000-000000000001');"
expect_denied "SET ROLE authenticated; SELECT * FROM public.v_audit_trail;"

admin_count="$(run_psql -qAtc "SET ROLE authenticated; SET request.jwt.claims='{\"sub\":\"00000000-0000-0000-0000-000000000099\",\"role\":\"authenticated\"}'; SELECT count(*) FROM public.get_audit_trail(NULL);")"
[ "$admin_count" = "3" ] || { echo "admin audit feed failed: $admin_count" >&2; exit 1; }

run_psql -c 'CREATE DATABASE missing_audit_dependency' >/dev/null
set +e
missing="$(docker exec "$NAME" psql -X -U postgres -d missing_audit_dependency -v ON_ERROR_STOP=1 -f /tmp/migration.sql 2>&1)"; status=$?
set -e
[ "$status" -ne 0 ] && [[ "$missing" == *"requires public.audit_log"* ]] || { echo "preflight did not fail closed" >&2; exit 1; }

echo 'P1_SCOPED_AUDIT_TRAIL_OK: tenant/admin/anonymous/view/idempotency/preflight scenarios passed.'
