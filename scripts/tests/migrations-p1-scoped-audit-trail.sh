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
  local output status expected="$2"
  set +e
  output="$(run_psql -c "$1" 2>&1)"; status=$?
  set -e
  [ "$status" -ne 0 ] && [[ "$output" == *"$expected"* ]] || {
    echo "expected denial containing: $expected" >&2; echo "$output" >&2; exit 1;
  }
}

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"
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
CREATE OR REPLACE FUNCTION public.pertence_a_empresa(_empresa_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_empresas ue WHERE ue.user_id=auth.uid() AND ue.empresa_id=_empresa_id) $$;

CREATE TABLE public.profiles(id uuid PRIMARY KEY, user_id uuid UNIQUE NOT NULL, nome text NOT NULL);
CREATE TABLE public.audit_log(
  id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(), tabela text NOT NULL,
  registro_id text NOT NULL, acao text NOT NULL, user_id uuid, user_email text,
  empresa_id uuid, dados_anteriores jsonb, dados_novos jsonb, campos_alterados text[]
);
CREATE TABLE public.audit_log_unified(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_table text NOT NULL,
  source_id uuid, empresa_id uuid, user_id uuid, action text, entity text,
  entity_id text, payload jsonb, ip_address inet, user_agent text,
  occurred_at timestamptz NOT NULL DEFAULT now(), ingested_at timestamptz NOT NULL DEFAULT now()
);
-- Reproduce the historical forwarding bug: tenant is not extracted from the
-- JSON snapshot. The remediation must backfill these rows and replace this
-- function without having to recreate the trigger.
CREATE OR REPLACE FUNCTION public.fwd_to_audit_unified() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.audit_log_unified(
    source_table, source_id, empresa_id, user_id, action, entity, entity_id,
    payload, occurred_at
  ) VALUES (
    TG_TABLE_NAME, NEW.id, NULL, NEW.user_id, NEW.acao, NEW.tabela,
    NEW.registro_id, to_jsonb(NEW) - 'id' - 'created_at' - 'user_id', NEW.created_at
  );
  RETURN NEW;
END $$;
CREATE TRIGGER trg_fwd_audit_unified AFTER INSERT ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.fwd_to_audit_unified();
CREATE VIEW public.v_audit_trail AS SELECT * FROM public.audit_log;
GRANT SELECT ON public.v_audit_trail TO authenticated;

INSERT INTO public.user_empresas VALUES
('00000000-0000-0000-0000-000000000001','10000000-0000-4000-8000-000000000001'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000009'),
('00000000-0000-0000-0000-000000000002','20000000-0000-4000-8000-000000000002');
INSERT INTO public.user_roles VALUES
('00000000-0000-0000-0000-000000000001','rh'),
('00000000-0000-0000-0000-000000000002','colaborador'),
('00000000-0000-0000-0000-000000000099','admin');
INSERT INTO public.profiles VALUES
('90000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000001','RH T1');
INSERT INTO public.audit_log(
  id, created_at, tabela, registro_id, acao, user_id, user_email,
  dados_anteriores, dados_novos, campos_alterados
) VALUES
('30000000-0000-4000-8000-000000000001',now()-interval '2 minute','folha','r1','UPDATE','00000000-0000-0000-0000-000000000001','rh@example.test',NULL,'{"empresa_id":"10000000-0000-4000-8000-000000000001","status":"fechada"}',ARRAY['status']),
('30000000-0000-4000-8000-000000000002',now()-interval '1 minute','folha','r2','UPDATE','00000000-0000-0000-0000-000000000002','user@example.test',NULL,'{"empresa_id":"20000000-0000-4000-8000-000000000002","status":"aberta"}',ARRAY['status']),
('30000000-0000-4000-8000-000000000003',now(),'misc','r3','UPDATE',NULL,NULL,NULL,'{"empresa_id":"not-a-uuid"}',NULL);
INSERT INTO public.audit_log(
  id, created_at, tabela, registro_id, acao, user_id, empresa_id,
  dados_anteriores, dados_novos, campos_alterados
) VALUES (
  '30000000-0000-4000-8000-000000000005',now(),'folha','physical-tenant','UPDATE',
  '00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000009',NULL,'{"status":"fechada"}',ARRAY['status']
);
SQL

for pass in 1 2; do run_psql -f /tmp/migration.sql >/dev/null; done

rh_count="$(run_psql -qAtc "SET ROLE authenticated; SET request.jwt.claims='{\"sub\":\"00000000-0000-0000-0000-000000000001\",\"role\":\"authenticated\"}'; SELECT count(*) FROM public.get_audit_trail('10000000-0000-4000-8000-000000000001');")"
[ "$rh_count" = "1" ] || { echo "RH tenant scope failed: $rh_count" >&2; exit 1; }

filtered_count="$(run_psql -qAtc "SET ROLE authenticated; SET request.jwt.claims='{\"sub\":\"00000000-0000-0000-0000-000000000001\",\"role\":\"authenticated\"}'; SELECT count(*) FROM public.get_audit_trail('10000000-0000-4000-8000-000000000001',100,now(),'folha','r1');")"
[ "$filtered_count" = "1" ] || { echo "entity filters failed: $filtered_count" >&2; exit 1; }

changed_fields="$(run_psql -qAtc "SET ROLE authenticated; SET request.jwt.claims='{\"sub\":\"00000000-0000-0000-0000-000000000001\",\"role\":\"authenticated\"}'; SELECT array_to_string(campos_alterados, ',') FROM public.get_audit_trail('10000000-0000-4000-8000-000000000001',100,now(),'folha','r1');")"
[ "$changed_fields" = "status" ] || { echo "changed fields normalization failed: $changed_fields" >&2; exit 1; }

physical_tenant_count="$(run_psql -qAtc "SET ROLE authenticated; SET request.jwt.claims='{\"sub\":\"00000000-0000-0000-0000-000000000001\",\"role\":\"authenticated\"}'; SELECT count(*) FROM public.get_audit_trail('10000000-0000-0000-0000-000000000009');")"
[ "$physical_tenant_count" = "1" ] || { echo "physical/non-RFC tenant backfill failed: $physical_tenant_count" >&2; exit 1; }

written_actor="$(run_psql -qAtc "SET ROLE authenticated; SET request.jwt.claims='{\"sub\":\"00000000-0000-0000-0000-000000000001\",\"role\":\"authenticated\"}'; SELECT public.registrar_auditoria('folha','secure-rpc','EXECUTE_CALC',NULL,'{\"total\":10}','10000000-0000-4000-8000-000000000001'); SELECT user_id FROM public.get_audit_trail('10000000-0000-4000-8000-000000000001',100,clock_timestamp()+interval '1 second','folha','secure-rpc');" | tail -1)"
[ "$written_actor" = "00000000-0000-0000-0000-000000000001" ] || { echo "server-derived audit actor failed: $written_actor" >&2; exit 1; }

expect_denied "SET ROLE authenticated; SET request.jwt.claims='{\"sub\":\"00000000-0000-0000-0000-000000000001\",\"role\":\"authenticated\"}'; SELECT public.registrar_auditoria('folha','missing-tenant','UPDATE');" "empresa_id required for audit event"
expect_denied "SET ROLE authenticated; SET request.jwt.claims='{\"sub\":\"00000000-0000-0000-0000-000000000001\",\"role\":\"authenticated\"}'; SELECT public.registrar_auditoria('folha','foreign-tenant','UPDATE',NULL,NULL,'20000000-0000-4000-8000-000000000002');" "company outside user scope"
expect_denied "SET ROLE anon; SELECT public.registrar_auditoria('folha','anonymous','UPDATE',NULL,NULL,'10000000-0000-4000-8000-000000000001');" "permission denied for function registrar_auditoria"

expect_denied "SET ROLE authenticated; SET request.jwt.claims='{\"sub\":\"00000000-0000-0000-0000-000000000002\",\"role\":\"authenticated\"}'; SELECT * FROM public.get_audit_trail('10000000-0000-4000-8000-000000000001');" "audit trail restricted to RH or administrator"
expect_denied "SET ROLE anon; SELECT * FROM public.get_audit_trail('10000000-0000-4000-8000-000000000001');" "permission denied for function get_audit_trail"
expect_denied "SET ROLE authenticated; SELECT * FROM public.v_audit_trail;" "permission denied for view v_audit_trail"

admin_count="$(run_psql -qAtc "SET ROLE authenticated; SET request.jwt.claims='{\"sub\":\"00000000-0000-0000-0000-000000000099\",\"role\":\"authenticated\"}'; SELECT count(*) FROM public.get_audit_trail(NULL);")"
[ "$admin_count" = "5" ] || { echo "admin audit feed failed: $admin_count" >&2; exit 1; }

# Domain filtering must happen inside the RPC before LIMIT. A newer unrelated
# event must not hide the older event requested by a module timeline.
run_psql -qAtc "INSERT INTO public.audit_log_unified(source_table,empresa_id,action,entity,entity_id,occurred_at) VALUES
  ('test','10000000-0000-4000-8000-000000000001','UPDATE','metas_okrs','target-old',now()-interval '10 seconds'),
  ('test','10000000-0000-4000-8000-000000000001','UPDATE','misc_newer','noise-new',now());" >/dev/null
domain_limited="$(run_psql -qAtc "SET ROLE authenticated; SET request.jwt.claims='{\"sub\":\"00000000-0000-0000-0000-000000000001\",\"role\":\"authenticated\"}'; SELECT registro_id FROM public.get_audit_trail('10000000-0000-4000-8000-000000000001',1,clock_timestamp()+interval '1 second',NULL,NULL,ARRAY['metas_okrs']);")"
[ "$domain_limited" = "target-old" ] || { echo "domain filter was applied after limit: $domain_limited" >&2; exit 1; }

# Future legacy inserts must be forwarded with the tenant populated.
run_psql -qAtc "INSERT INTO public.audit_log(id,tabela,registro_id,acao,dados_novos) VALUES ('30000000-0000-4000-8000-000000000004','folha','r4','INSERT','{\"empresa_id\":\"10000000-0000-4000-8000-000000000001\"}');" >/dev/null
forwarded_tenant="$(run_psql -qAtc "SELECT empresa_id FROM public.audit_log_unified WHERE source_id='30000000-0000-4000-8000-000000000004';")"
[ "$forwarded_tenant" = "10000000-0000-4000-8000-000000000001" ] || { echo "future forwarding lost tenant: $forwarded_tenant" >&2; exit 1; }

run_psql -c 'CREATE DATABASE missing_audit_dependency' >/dev/null
set +e
missing="$(docker exec "$NAME" psql -X -U postgres -d missing_audit_dependency -v ON_ERROR_STOP=1 -f /tmp/migration.sql 2>&1)"; status=$?
set -e
[ "$status" -ne 0 ] && [[ "$missing" == *"requires public.audit_log"* ]] || { echo "preflight did not fail closed" >&2; exit 1; }

echo 'P1_SCOPED_AUDIT_TRAIL_OK: tenant/admin/anonymous/view/filter/writer-authorship/backfill/forwarding/idempotency/preflight scenarios passed.'
