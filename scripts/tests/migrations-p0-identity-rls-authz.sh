#!/usr/bin/env bash
# Exercises server-owned tenant/RBAC and PII policy remediation in PostgreSQL 17.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260912190000_p0_identity_rls_authz.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p0-identity-rls-$$"

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
test -f "$MIGRATION" || { echo "migration not found: $MIGRATION" >&2; exit 1; }

cleanup() {
  [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

run_psql() {
  docker exec "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"
}

expect_denied() {
  local sql="$1"
  local output status
  set +e
  output="$(run_psql -c "$sql" 2>&1)"
  status=$?
  set -e
  if [ "$status" -eq 0 ] || [[ "$output" != *"permission denied"* ]]; then
    echo "expected permission denial" >&2
    echo "$output" >&2
    exit 1
  fi
}

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
for _ in $(seq 1 60); do
  docker exec "$NAME" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1 && break
  sleep 1
done
docker cp "$MIGRATION" "$NAME":/tmp/p0-identity-rls.sql

docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TYPE public.app_role AS ENUM ('admin','rh','gestor','financeiro','auditor','colaborador');

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid $$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE
AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;

CREATE TABLE public.user_empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
  empresa_id uuid NOT NULL, is_default boolean, created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, empresa_id)
);
CREATE TABLE public.user_roles (user_id uuid NOT NULL, role public.app_role NOT NULL, UNIQUE(user_id,role));
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT public.has_role(_user_id,'admin'::public.app_role) $$;
CREATE OR REPLACE FUNCTION public.get_user_empresas(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT empresa_id FROM public.user_empresas WHERE user_id=_user_id $$;

CREATE OR REPLACE FUNCTION public.user_empresa_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT (auth.jwt()->'user_metadata'->>'empresa_id')::uuid $$;

CREATE TABLE public.login_lockouts(identifier text PRIMARY KEY, attempts int DEFAULT 0);
CREATE OR REPLACE FUNCTION public.reset_login_attempts(p_identifier text, p_identifier_type text DEFAULT 'email')
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public
AS $$ UPDATE public.login_lockouts SET attempts=0 WHERE identifier=p_identifier $$;
GRANT EXECUTE ON FUNCTION public.reset_login_attempts(text,text) TO anon, authenticated;

CREATE TABLE public.colaboradores(id uuid PRIMARY KEY, empresa_id uuid NOT NULL);
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'audit_log','cnab_configuracoes','historico_rescisoes','admissoes',
    'batidas_ponto','provisoes_mensais','registros_ponto','faltas',
    'esocial_eventos','folhas_pagamento','desligamentos','banco_horas',
    'solicitacoes_ajuste_ponto','documentos_assinatura'
  ] LOOP
    EXECUTE format('CREATE TABLE public.%I (id uuid PRIMARY KEY, empresa_id uuid)',table_name);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated',table_name);
  END LOOP;
END $$;
CREATE TABLE public.exames(id uuid PRIMARY KEY, colaborador_id uuid NOT NULL);
CREATE TABLE public.colaborador_beneficios(id uuid PRIMARY KEY, colaborador_id uuid NOT NULL);
ALTER TABLE public.exames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_beneficios ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.exames, public.colaborador_beneficios TO authenticated;

CREATE POLICY view_audit ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários podem ver configurações de suas empresas" ON public.cnab_configuracoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados podem ver rescisoes" ON public.historico_rescisoes FOR SELECT TO authenticated USING (true);

CREATE POLICY admissoes_tenant_select ON public.admissoes FOR SELECT TO authenticated USING (empresa_id=public.user_empresa_id());
CREATE POLICY batidas_ponto_tenant_select ON public.batidas_ponto FOR SELECT TO authenticated USING (empresa_id=public.user_empresa_id());
CREATE POLICY provisoes_mensais_tenant_select ON public.provisoes_mensais FOR SELECT TO authenticated USING (empresa_id=public.user_empresa_id());
CREATE POLICY registros_ponto_tenant_select ON public.registros_ponto FOR SELECT TO authenticated USING (empresa_id=public.user_empresa_id());
CREATE POLICY faltas_tenant_select ON public.faltas FOR SELECT TO authenticated USING (empresa_id=public.user_empresa_id());
CREATE POLICY esocial_eventos_tenant_select ON public.esocial_eventos FOR SELECT TO authenticated USING (empresa_id=public.user_empresa_id());
CREATE POLICY folhas_pagamento_tenant_select ON public.folhas_pagamento FOR SELECT TO authenticated USING (empresa_id=public.user_empresa_id());
CREATE POLICY desligamentos_tenant_select ON public.desligamentos FOR SELECT TO authenticated USING (empresa_id=public.user_empresa_id());
CREATE POLICY banco_horas_tenant_select ON public.banco_horas FOR SELECT TO authenticated USING (empresa_id=public.user_empresa_id());
CREATE POLICY solicitacoes_ajuste_ponto_tenant_select ON public.solicitacoes_ajuste_ponto FOR SELECT TO authenticated USING (empresa_id=public.user_empresa_id());
CREATE POLICY documentos_assinatura_tenant_select ON public.documentos_assinatura FOR SELECT TO authenticated USING (empresa_id=public.user_empresa_id());
CREATE POLICY exames_tenant_select ON public.exames FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.colaboradores c WHERE c.id=exames.colaborador_id AND c.empresa_id=public.user_empresa_id()));
CREATE POLICY colaborador_beneficios_tenant_select ON public.colaborador_beneficios FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.colaboradores c WHERE c.id=colaborador_beneficios.colaborador_id AND c.empresa_id=public.user_empresa_id()));

CREATE VIEW public.v_system_health AS SELECT 1 AS ok;
CREATE VIEW public.v_audit_trail AS SELECT 1 AS ok;
GRANT SELECT ON public.v_system_health TO anon, authenticated;
GRANT SELECT ON public.v_audit_trail TO anon, authenticated;

INSERT INTO public.user_empresas(user_id,empresa_id,is_default) VALUES
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',true),
('00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002',true),
('00000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001',true);
INSERT INTO public.user_roles VALUES
('00000000-0000-0000-0000-000000000003','rh'),
('00000000-0000-0000-0000-000000000099','admin');
INSERT INTO public.admissoes VALUES
('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002');
INSERT INTO public.audit_log VALUES
('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002');
SQL

# Prove the vulnerable baseline before remediation: forged metadata selects T2.
before="$(run_psql -qAtc "SET ROLE authenticated; SET request.jwt.claims='{\"sub\":\"00000000-0000-0000-0000-000000000001\",\"user_metadata\":{\"empresa_id\":\"20000000-0000-0000-0000-000000000002\"}}'; SELECT count(*) FROM public.admissoes;")"
[ "$before" = "1" ] || { echo "fixture did not reproduce forged-tenant access: $before" >&2; exit 1; }

for pass in 1 2; do
  run_psql -f /tmp/p0-identity-rls.sql >/dev/null
  echo "identity/RLS migration pass $pass succeeded"
done

after="$(run_psql -qAtc "SET ROLE authenticated; SET request.jwt.claims='{\"sub\":\"00000000-0000-0000-0000-000000000001\",\"user_metadata\":{\"empresa_id\":\"20000000-0000-0000-0000-000000000002\"}}'; SELECT public.user_empresa_id()::text || ':' || count(*) FROM public.admissoes;")"
[ "$after" = "10000000-0000-0000-0000-000000000001:1" ] || { echo "server-owned tenant contract failed: $after" >&2; exit 1; }

open_audit="$(run_psql -qAtc "SET ROLE authenticated; SET request.jwt.claims='{\"sub\":\"00000000-0000-0000-0000-000000000001\"}'; SELECT count(*) FROM public.audit_log;")"
[ "$open_audit" = "0" ] || { echo "non-admin still reads audit_log: $open_audit" >&2; exit 1; }

rh_allowed="$(run_psql -qAtc "SET ROLE service_role; SELECT public.pode_gerir_rh_para('00000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001');")"
[ "$rh_allowed" = "t" ] || { echo "legitimate RH was denied" >&2; exit 1; }
global_admin_allowed="$(run_psql -qAtc "SET ROLE service_role; SELECT public.pode_gerir_rh_para('00000000-0000-0000-0000-000000000099','20000000-0000-0000-0000-000000000002');")"
[ "$global_admin_allowed" = "t" ] || { echo "global admin without tenant membership was denied" >&2; exit 1; }

expect_denied "SET ROLE authenticated; SELECT public.pode_gerir_rh_para('00000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001');"
expect_denied "SET ROLE anon; SELECT public.reset_login_attempts('victim','email');"
expect_denied "SET ROLE authenticated; SELECT * FROM public.v_audit_trail;"
expect_denied "SET ROLE anon; SELECT * FROM public.v_system_health;"

run_psql -c 'CREATE DATABASE p0_identity_missing_prerequisite' >/dev/null
set +e
missing="$(docker exec "$NAME" psql -X -U postgres -d p0_identity_missing_prerequisite -v ON_ERROR_STOP=1 -f /tmp/p0-identity-rls.sql 2>&1)"
status=$?
set -e
if [ "$status" -eq 0 ] || [[ "$missing" != *"requires public.user_empresas"* ]]; then
  echo "missing prerequisite did not fail closed" >&2
  exit 1
fi

echo 'P0_IDENTITY_RLS_AUTHZ_OK: reproduced forged metadata, then validated server-owned tenant, PII isolation, service-only explicit authz, reset/view denial, idempotency and preflight.'
