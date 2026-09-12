#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260912205000_p1_payroll_audit_read_contract.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p1-payroll-audit-read-$$"

cleanup() {
  [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT
run_psql() { docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"
docker cp "$MIGRATION" "$NAME":/tmp/migration.sql

run_psql <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE TABLE public.audit_log(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  tabela text NOT NULL,
  registro_id text,
  acao text NOT NULL,
  empresa_id uuid,
  dados_novos jsonb DEFAULT '{}',
  user_id uuid,
  user_email text,
  ip_address inet
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.audit_log TO authenticated, service_role;
CREATE POLICY audit_tenant_read ON public.audit_log FOR SELECT TO authenticated
USING (empresa_id::text = current_setting('app.empresa_id', true));
CREATE VIEW public.vw_folha_compliance AS SELECT id AS audit_id FROM public.audit_log;

INSERT INTO public.audit_log(tabela,registro_id,acao,empresa_id,dados_novos) VALUES
  ('folhas_pagamento','folha-current','PAYROLL_CLOSE','10000000-0000-0000-0000-000000000001','{"competencia":"2026-09"}'),
  ('folhas_pagamento','folha-legacy','CLOSE','10000000-0000-0000-0000-000000000001','{"competencia":"2026-08"}'),
  ('folhas_pagamento','folha-other','PAYROLL_REOPEN','20000000-0000-0000-0000-000000000002','{"competencia":"2026-09"}'),
  ('folhas_pagamento','folha-update','UPDATE','10000000-0000-0000-0000-000000000001','{}');
SQL

for pass in 1 2; do
  run_psql -f /tmp/migration.sql >/dev/null
  echo "payroll audit read migration pass $pass succeeded"
done

tenant_result="$(run_psql -qAtc "SET ROLE authenticated; SET app.empresa_id='10000000-0000-0000-0000-000000000001'; SELECT count(*)||':'||string_agg(DISTINCT acao, ',') FROM public.vw_folha_compliance;")"
[ "$tenant_result" = '2:PAYROLL_CLOSE' ] || {
  echo "tenant view did not normalize/filter payroll actions: $tenant_result" >&2
  exit 1
}

service_result="$(run_psql -qAtc "SET ROLE service_role; SELECT count(*)||':'||string_agg(DISTINCT acao, ',' ORDER BY acao) FROM public.vw_folha_compliance;")"
[ "$service_result" = '3:PAYROLL_CLOSE,PAYROLL_REOPEN' ] || {
  echo "service view inventory is incorrect: $service_result" >&2
  exit 1
}

[ "$(run_psql -qAtc "SELECT COALESCE(array_to_string(reloptions, ','),'') FROM pg_class WHERE oid='public.vw_folha_compliance'::regclass;")" = 'security_invoker=true' ] || {
  echo 'view is not security_invoker' >&2
  exit 1
}
[ "$(run_psql -qAtc "SELECT has_table_privilege('anon','public.vw_folha_compliance','SELECT');")" = 'f' ] || {
  echo 'anon retained payroll compliance access' >&2
  exit 1
}
[ "$(run_psql -qAtc "SELECT has_table_privilege('authenticated','public.vw_folha_compliance','SELECT');")" = 't' ] || {
  echo 'authenticated lost payroll compliance access' >&2
  exit 1
}

run_psql -c 'CREATE DATABASE missing_payroll_audit' >/dev/null
set +e
missing="$(docker exec -i "$NAME" psql -X -U postgres -d missing_payroll_audit -v ON_ERROR_STOP=1 -f /tmp/migration.sql 2>&1)"
status=$?
set -e
[ "$status" -ne 0 ] && [[ "$missing" == *'requires audit_log and vw_folha_compliance'* ]] || {
  echo 'payroll audit preflight did not fail closed' >&2
  exit 1
}

echo 'P1_PAYROLL_AUDIT_READ_CONTRACT_OK: current/legacy actions, normalization, tenant RLS, grants and preflight passed.'
