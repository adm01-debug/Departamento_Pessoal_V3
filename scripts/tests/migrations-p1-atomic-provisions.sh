#!/usr/bin/env bash
# Validates provision schema alignment and atomic replacement/audit rollback.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260912193000_p1_atomic_provisions_contract.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p1-atomic-provisions-$$"

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
cleanup() { [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

run_psql() { docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }

echo "Starting disposable $IMAGE database: $NAME"
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"
docker cp "$MIGRATION" "$NAME":/tmp/p1-provisions.sql

run_psql <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE TABLE public.empresas (id uuid PRIMARY KEY);
CREATE TABLE public.colaboradores (id uuid PRIMARY KEY, empresa_id uuid NOT NULL REFERENCES public.empresas);
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tabela text NOT NULL,
  registro_id uuid NOT NULL, acao text NOT NULL, user_id uuid NOT NULL,
  dados_novos jsonb
);
CREATE TABLE public.provisoes_folha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid NOT NULL REFERENCES public.empresas,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores, competencia text NOT NULL,
  valor_13_salario numeric(15,2), valor_ferias numeric(15,2), encargos_provisao numeric(15,2)
);
CREATE TABLE public.provisoes_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid NOT NULL REFERENCES public.empresas,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores, competencia date NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('ferias','13_salario')),
  valor_principal numeric(15,2) NOT NULL, encargos_inss numeric(15,2) NOT NULL,
  encargos_fgts numeric(15,2) NOT NULL,
  total numeric(15,2) GENERATED ALWAYS AS (valor_principal+encargos_inss+encargos_fgts) STORED,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
INSERT INTO public.empresas VALUES ('00000000-0000-4000-8000-000000000001');
INSERT INTO public.empresas VALUES ('00000000-0000-4000-8000-000000000002');
INSERT INTO public.colaboradores VALUES
  ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000002');
INSERT INTO public.provisoes_mensais
  (empresa_id,colaborador_id,competencia,tipo,valor_principal,encargos_inss,encargos_fgts)
VALUES
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','2026-09-01','ferias',999,0,0);
SQL

for pass in 1 2; do
  run_psql -f /tmp/p1-provisions.sql >/dev/null
  echo "migration pass $pass succeeded"
done

run_psql -qAtc "INSERT INTO public.provisoes_folha
  (empresa_id,colaborador_id,competencia,valor_13_salario,valor_ferias,encargos_provisao,valor_total)
  VALUES ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','2026-09',250,333.33,214.67,-1)
  ON CONFLICT (empresa_id,colaborador_id,competencia) DO UPDATE SET valor_13_salario=EXCLUDED.valor_13_salario;"
[ "$(run_psql -Atc "SELECT valor_total FROM public.provisoes_folha")" = '798.00' ]

signature='public.replace_monthly_provisions(uuid, text, jsonb, uuid, jsonb)'
[ "$(run_psql -Atc "SELECT has_function_privilege('anon', '$signature', 'EXECUTE')")" = 'f' ]
[ "$(run_psql -Atc "SELECT has_function_privilege('authenticated', '$signature', 'EXECUTE')")" = 'f' ]
[ "$(run_psql -Atc "SELECT has_function_privilege('service_role', '$signature', 'EXECUTE')")" = 't' ]

rows='[{"colaborador_id":"00000000-0000-4000-8000-000000000011","tipo":"ferias","valor_principal":100,"encargos_inss":20,"encargos_fgts":8},{"colaborador_id":"00000000-0000-4000-8000-000000000012","tipo":"13_salario","valor_principal":90,"encargos_inss":18,"encargos_fgts":7.2}]'
inserted="$(run_psql -qAtc "SET ROLE service_role; SELECT public.replace_monthly_provisions(
  '00000000-0000-4000-8000-000000000001','2026-09','$rows'::jsonb,
  '00000000-0000-4000-8000-000000000099','{\"hash_sha256\":\"ok\"}'::jsonb)")"
[ "$inserted" = '2' ]
[ "$(run_psql -Atc "SELECT count(*) FROM public.provisoes_mensais WHERE competencia='2026-09-01'")" = '2' ]
[ "$(run_psql -Atc "SELECT count(*) FROM public.audit_log WHERE acao='CALCULATE_BATCH'")" = '1' ]

# One invalid FK must roll back both the deletion and the mandatory audit.
bad_rows='[{"colaborador_id":"00000000-0000-4000-8000-000000000011","tipo":"ferias","valor_principal":1,"encargos_inss":1,"encargos_fgts":1},{"colaborador_id":"00000000-0000-4000-8000-000000000099","tipo":"13_salario","valor_principal":1,"encargos_inss":1,"encargos_fgts":1}]'
set +e
run_psql -qAtc "SET ROLE service_role; SELECT public.replace_monthly_provisions(
  '00000000-0000-4000-8000-000000000001','2026-09','$bad_rows'::jsonb,
  '00000000-0000-4000-8000-000000000099','{}'::jsonb)" >/dev/null 2>&1
bad_status=$?
set -e
[ "$bad_status" -ne 0 ]
[ "$(run_psql -Atc "SELECT count(*) FROM public.provisoes_mensais WHERE competencia='2026-09-01'")" = '2' ]
[ "$(run_psql -Atc "SELECT count(*) FROM public.audit_log")" = '1' ]

cross_tenant_rows='[{"colaborador_id":"00000000-0000-4000-8000-000000000021","tipo":"ferias","valor_principal":1,"encargos_inss":1,"encargos_fgts":1}]'
set +e
cross_tenant_output="$(run_psql -qAtc "SET ROLE service_role; SELECT public.replace_monthly_provisions(
  '00000000-0000-4000-8000-000000000001','2026-09','$cross_tenant_rows'::jsonb,
  '00000000-0000-4000-8000-000000000099','{}'::jsonb)" 2>&1)"
cross_tenant_status=$?
set -e
if [ "$cross_tenant_status" -eq 0 ] || [[ "$cross_tenant_output" != *'outside the company'* ]]; then
  echo 'cross-tenant provision row was not rejected' >&2; exit 1
fi
[ "$(run_psql -Atc "SELECT count(*) FROM public.provisoes_mensais WHERE competencia='2026-09-01'")" = '2' ]

run_psql -c 'CREATE DATABASE p1_provisions_missing_prerequisite' >/dev/null
set +e
failure="$(docker exec -i "$NAME" psql -X -U postgres -d p1_provisions_missing_prerequisite -v ON_ERROR_STOP=1 -f /tmp/p1-provisions.sql 2>&1)"
status=$?
set -e
if [ "$status" -eq 0 ] || [[ "$failure" != *'requires provisoes_folha, provisoes_mensais, colaboradores and audit_log'* ]]; then
  echo 'migration did not fail closed without prerequisites' >&2
  exit 1
fi

echo 'P1_ATOMIC_PROVISIONS_OK: schema contract, computed total, unique upsert, ACL, atomic replacement/audit rollback, idempotency and preflight validated.'
