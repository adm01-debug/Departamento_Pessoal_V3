#!/usr/bin/env bash
# Validates the consolidated PCS contract with authorization, tenant and race scenarios.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260912202000_p1_pcs_contract.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p1-pcs-contract-$$"
RESULT_DIR="$(mktemp -d)"

cleanup() {
  [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true
  rm -rf "$RESULT_DIR"
}
trap cleanup EXIT

run_psql() {
  docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"
}

expect_failure() {
  local sql="$1"
  local expected="$2"
  local output
  set +e
  output="$(run_psql -c "$sql" 2>&1)"
  local status=$?
  set -e
  if [ "$status" -eq 0 ] || [[ "$output" != *"$expected"* ]]; then
    echo "expected failure containing: $expected" >&2
    echo "$output" >&2
    exit 1
  fi
}

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"
docker cp "$MIGRATION" "$NAME":/tmp/p1-pcs.sql

run_psql <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'rh', 'user');
CREATE TABLE public.empresas (id uuid PRIMARY KEY, nome text NOT NULL);
CREATE TABLE public.cargos (
  id uuid PRIMARY KEY,
  empresa_id uuid REFERENCES public.empresas(id),
  nome text NOT NULL,
  salario_base numeric,
  ativo boolean DEFAULT true
);
CREATE TABLE public.colaboradores (
  id uuid PRIMARY KEY,
  empresa_id uuid REFERENCES public.empresas(id),
  nome_completo text NOT NULL,
  cargo text NOT NULL,
  departamento text NOT NULL,
  salario_base numeric NOT NULL,
  status text NOT NULL
);
CREATE TABLE public.user_empresas (user_id uuid NOT NULL, empresa_id uuid NOT NULL);
CREATE TABLE public.user_roles (user_id uuid NOT NULL, role public.app_role NOT NULL);

CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE FUNCTION public.get_user_empresas(_user_id uuid) RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ SELECT empresa_id FROM public.user_empresas WHERE user_id=_user_id $$;
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$ SELECT public.has_role(_user_id, 'admin'::public.app_role) $$;
CREATE FUNCTION public.pode_gerir_rh(_empresa_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $$
  SELECT public.is_admin(auth.uid()) OR (
    _empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
    AND public.has_role(auth.uid(), 'rh'::public.app_role)
  )
$$;

-- Reproduce the five-table legacy PCS schema: narrower precision, missing
-- checks/unique order and cargo survey rows deleted by CASCADE.
CREATE TABLE public.pcs_planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL, versao integer NOT NULL DEFAULT 1, status text NOT NULL DEFAULT 'rascunho',
  vigencia_inicio date, vigencia_fim date, amplitude_pct numeric(6,2) NOT NULL DEFAULT 40,
  num_steps integer NOT NULL DEFAULT 5, overlap_pct numeric(6,2) NOT NULL DEFAULT 25,
  observacoes text, created_by uuid, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  UNIQUE(empresa_id,nome,versao)
);
CREATE TABLE public.pcs_fatores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plano_id uuid NOT NULL REFERENCES public.pcs_planos(id) ON DELETE CASCADE,
  nome text NOT NULL, descricao text, peso numeric(6,2) NOT NULL DEFAULT 1,
  ordem integer NOT NULL DEFAULT 0, graus jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plano_id,nome)
);
CREATE TABLE public.pcs_avaliacoes_cargo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plano_id uuid NOT NULL REFERENCES public.pcs_planos(id) ON DELETE CASCADE,
  cargo_id uuid NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE, pontuacoes jsonb NOT NULL DEFAULT '{}',
  pontos_total numeric(12,2) NOT NULL DEFAULT 0, justificativa text, avaliado_por uuid,
  avaliado_em timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(plano_id,cargo_id)
);
CREATE TABLE public.pcs_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plano_id uuid NOT NULL REFERENCES public.pcs_planos(id) ON DELETE CASCADE,
  ordem integer NOT NULL, nome text NOT NULL, pontos_min numeric(12,2) NOT NULL, pontos_max numeric(12,2) NOT NULL,
  salario_min numeric(14,2) NOT NULL, salario_medio numeric(14,2) NOT NULL, salario_max numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(plano_id,ordem)
);
CREATE TABLE public.pcs_pesquisa_salarial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cargo_id uuid REFERENCES public.cargos(id) ON DELETE CASCADE, cargo_referencia text NOT NULL,
  fonte text NOT NULL, data_referencia date NOT NULL, regiao text, amostra integer,
  p25 numeric(14,2), p50 numeric(14,2), p75 numeric(14,2), p90 numeric(14,2),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
SQL

for pass in 1 2; do
  run_psql -f /tmp/p1-pcs.sql >/dev/null
  echo "PCS migration pass $pass succeeded"
done

legacy_contract="$(run_psql -qAtc "SELECT
  (SELECT numeric_precision||':'||numeric_scale FROM information_schema.columns WHERE table_schema='public' AND table_name='pcs_avaliacoes_cargo' AND column_name='pontos_total') || ':' ||
  (SELECT confdeltype::text FROM pg_constraint WHERE conrelid='public.pcs_pesquisa_salarial'::regclass AND conname='pcs_pesquisa_salarial_cargo_id_fkey') || ':' ||
  (SELECT count(*) FROM pg_constraint WHERE conrelid='public.pcs_fatores'::regclass AND conname='pcs_fatores_plano_id_ordem_key');")"
[ "$legacy_contract" = '14:4:n:1' ] || { echo "legacy PCS schema was not upgraded: $legacy_contract" >&2; exit 1; }

run_psql <<'SQL'
INSERT INTO public.empresas(id,nome) VALUES
  ('10000000-0000-0000-0000-000000000001','T1'),
  ('20000000-0000-0000-0000-000000000002','T2');
INSERT INTO public.user_empresas(user_id,empresa_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','10000000-0000-0000-0000-000000000001'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2','10000000-0000-0000-0000-000000000001');
INSERT INTO public.user_roles(user_id,role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','rh'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2','user'),
  ('cccccccc-cccc-cccc-cccc-ccccccccccc3','admin');
INSERT INTO public.cargos(id,empresa_id,nome,salario_base) VALUES
  ('11000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Junior',1000),
  ('11000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Pleno',1500),
  ('11000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','Senior',2000),
  ('11000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','Pesquisa removida',1800),
  ('22000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','Foreign',3000);
GRANT SELECT ON public.empresas, public.cargos, public.colaboradores TO authenticated;
SQL

run_psql -qAtc "INSERT INTO public.pcs_pesquisa_salarial(empresa_id,cargo_id,cargo_referencia,fonte,data_referencia,p50) VALUES ('10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000004','Pesquisa removida','Mercado','2026-09-01',1900); DELETE FROM public.cargos WHERE id='11000000-0000-0000-0000-000000000004';" >/dev/null
survey_preserved="$(run_psql -qAtc "SELECT count(*)||':'||count(cargo_id) FROM public.pcs_pesquisa_salarial WHERE cargo_referencia='Pesquisa removida';")"
[ "$survey_preserved" = '1:0' ] || { echo "salary survey history was deleted with cargo: $survey_preserved" >&2; exit 1; }

# RH creates a tenant plan. Server-side authorship must replace the forged id.
plan_id="$(run_psql -qAt <<'SQL'
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',false) AS ignored \gset
INSERT INTO public.pcs_planos(empresa_id,nome,created_by)
VALUES ('10000000-0000-0000-0000-000000000001','PCS 2026','ffffffff-ffff-ffff-ffff-ffffffffffff')
RETURNING id;
SQL
)"
created_by="$(run_psql -qAtc "SELECT created_by FROM public.pcs_planos WHERE id='$plan_id'")"
[ "$created_by" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1' ] || {
  echo "server-owned plan authorship failed" >&2; exit 1;
}

factor_id="$(run_psql -qAt <<SQL
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',false) AS ignored \gset
INSERT INTO public.pcs_fatores(plano_id,nome,peso,ordem,graus)
VALUES ('$plan_id','Complexidade',2,0,'[
  {"grau":1,"rotulo":"Inicial","pontos":10},
  {"grau":2,"rotulo":"Intermediario","pontos":55},
  {"grau":3,"rotulo":"Senior","pontos":100}
]'::jsonb) RETURNING id;
SQL
)"

run_psql <<SQL
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',false);
INSERT INTO public.pcs_avaliacoes_cargo(plano_id,cargo_id,pontuacoes,avaliado_por) VALUES
  ('$plan_id','11000000-0000-0000-0000-000000000001',jsonb_build_object('$factor_id',10),'ffffffff-ffff-ffff-ffff-ffffffffffff'),
  ('$plan_id','11000000-0000-0000-0000-000000000002',jsonb_build_object('$factor_id',55),'ffffffff-ffff-ffff-ffff-ffffffffffff'),
  ('$plan_id','11000000-0000-0000-0000-000000000003',jsonb_build_object('$factor_id',100),'ffffffff-ffff-ffff-ffff-ffffffffffff');
RESET ROLE;
INSERT INTO public.colaboradores(id,empresa_id,nome_completo,cargo,departamento,salario_base,status,cargo_id) VALUES
  ('31000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Pessoa Junior','Junior','TI',800,'ativo','11000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Pessoa Pleno','Pleno','TI',1500,'ativo','11000000-0000-0000-0000-000000000002'),
  ('31000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','Pessoa Senior','Senior','TI',2500,'ativo','11000000-0000-0000-0000-000000000003');
SQL

totals="$(run_psql -qAtc "SELECT string_agg(pontos_total::text,',' ORDER BY pontos_total) FROM public.pcs_avaliacoes_cargo WHERE plano_id='$plan_id'")"
[ "$totals" = '20.0000,110.0000,200.0000' ] || { echo "server score calculation failed: $totals" >&2; exit 1; }

# Invalid factor/score, cross-tenant cargo and mutable author all fail closed.
expect_failure "SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',false); INSERT INTO public.pcs_fatores(plano_id,nome,ordem,graus) VALUES ('$plan_id','Invalid',9,'[]');" 'non-empty JSON array'
expect_failure "SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',false); INSERT INTO public.pcs_avaliacoes_cargo(plano_id,cargo_id,pontuacoes) VALUES ('$plan_id','22000000-0000-0000-0000-000000000001',jsonb_build_object('$factor_id',10));" 'does not belong to the PCS tenant'
expect_failure "SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',false); UPDATE public.pcs_planos SET created_by='ffffffff-ffff-ffff-ffff-ffffffffffff' WHERE id='$plan_id';" 'created_by is immutable'
expect_failure "SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',false); UPDATE public.pcs_avaliacoes_cargo SET pontuacoes=jsonb_build_object('$factor_id',42) WHERE plano_id='$plan_id' AND cargo_id='11000000-0000-0000-0000-000000000001';" 'unknown factor or value'

# Ordinary members can read their tenant but cannot mutate PCS configuration.
member_count="$(run_psql -qAt <<SQL
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',false) AS ignored \gset
SELECT count(*) FROM public.pcs_planos WHERE id='$plan_id';
SQL
)"
[ "$member_count" = '1' ] || { echo "tenant member cannot read PCS" >&2; exit 1; }
expect_failure "SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',false); INSERT INTO public.pcs_fatores(plano_id,nome,ordem,graus) VALUES ('$plan_id','Forbidden',9,'[{\"grau\":1,\"rotulo\":\"X\",\"pontos\":1}]');" 'row-level security'

# Two simultaneous generations serialize on the plan and leave one coherent matrix.
pids=()
for i in 1 2; do
  docker exec "$NAME" psql -X -qAt -U postgres -v ON_ERROR_STOP=1 -c \
    "SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',false); SELECT count(*) FROM public.pcs_gerar_grades('$plan_id',2,1000);" \
    >"$RESULT_DIR/$i" &
  pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid" || { echo "concurrent PCS generation process failed" >&2; exit 1; }; done
[ "$(grep -h '^2$' "$RESULT_DIR"/* | wc -l | tr -d ' ')" = '2' ] || {
  echo "concurrent PCS grade generation failed" >&2; exit 1;
}
grade_count="$(run_psql -qAtc "SELECT count(*) FROM public.pcs_grades WHERE plano_id='$plan_id'")"
[ "$grade_count" = '2' ] || { echo "PCS matrix is not atomic: $grade_count rows" >&2; exit 1; }

# A score exactly on the shared boundary belongs to one grade (the higher one), never two.
fit="$(run_psql -qAt <<SQL
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',false) AS ignored \gset
SELECT count(*) || ':' || max(grade_ordem) FROM public.pcs_enquadramento('$plan_id')
WHERE colaborador_id='31000000-0000-0000-0000-000000000002';
SQL
)"
[ "$fit" = '1:2' ] || { echo "boundary assignment is ambiguous: $fit" >&2; exit 1; }

impact="$(run_psql -qAt <<SQL
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',false) AS ignored \gset
SELECT public.pcs_simular_impacto('$plan_id',36.8)->>'colaboradores_enquadrados';
SQL
)"
[ "$impact" = '3' ] || { echo "PCS impact aggregation failed: $impact" >&2; exit 1; }

member_visibility="$(run_psql -qAt <<SQL
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',false) AS ignored \gset
SELECT count(*) || ':' || (public.pcs_simular_impacto('$plan_id',36.8)->>'colaboradores_enquadrados')
FROM public.pcs_enquadramento('$plan_id');
SQL
)"
[ "$member_visibility" = '0:3' ] || {
  echo "ordinary member nominal/aggregate PCS boundary failed: $member_visibility" >&2; exit 1;
}

# Anonymous callers cannot enumerate tables or call privileged RPCs.
expect_failure "SET ROLE anon; SELECT * FROM public.pcs_planos;" 'permission denied'
expect_failure "SET ROLE anon; SELECT * FROM public.pcs_gerar_grades('$plan_id',2,1000);" 'permission denied'

# Preflight rejects both missing prerequisites and a partial pre-existing PCS schema.
run_psql -c 'CREATE DATABASE pcs_missing_prerequisites' >/dev/null
set +e
missing="$(docker exec -i "$NAME" psql -X -U postgres -d pcs_missing_prerequisites -v ON_ERROR_STOP=1 -f /tmp/p1-pcs.sql 2>&1)"
status=$?
set -e
[ "$status" -ne 0 ] && [[ "$missing" == *'requires public.empresas'* ]] || {
  echo "PCS missing-prerequisite preflight failed" >&2; exit 1;
}

echo 'P1_PCS_CONTRACT_OK: schema, RBAC/RLS, immutable authorship, score validation, tenant isolation, atomic concurrency, boundary assignment, impact and preflight passed.'
