#!/usr/bin/env bash
# Validates the payroll header/item ON CONFLICT contracts in disposable PostgreSQL.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260911195000_p0_payroll_upsert_contract.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p0-payroll-upsert-$$"

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
test -f "$MIGRATION" || { echo "migration not found: $MIGRATION" >&2; exit 1; }

cleanup() {
  [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

run_psql() {
  if [ "$#" -eq 0 ]; then
    docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1
  else
    docker exec "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"
  fi
}

run_psql_db() {
  docker exec -i "$NAME" psql -X -U postgres -d "$1" -v ON_ERROR_STOP=1
}

expect_failure() {
  local database="$1"
  local expected_message="$2"
  local output status

  set +e
  output="$(docker exec -i "$NAME" psql -X -U postgres -d "$database" -v ON_ERROR_STOP=1 -f /tmp/p0-payroll-upsert.sql 2>&1)"
  status=$?
  set -e

  if [ "$status" -eq 0 ] || [[ "$output" != *"$expected_message"* ]]; then
    echo "expected fail-closed migration error in $database" >&2
    echo "$output" >&2
    exit 1
  fi
}

echo "Starting disposable $IMAGE database: $NAME"
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null

ready=0
for _ in $(seq 1 60); do
  if docker exec "$NAME" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
[ "$ready" = "1" ] || { docker logs "$NAME" >&2; exit 1; }

docker cp "$MIGRATION" "$NAME":/tmp/p0-payroll-upsert.sql

run_psql <<'SQL'
CREATE TABLE public.folhas_pagamento (
  id uuid PRIMARY KEY,
  empresa_id uuid NOT NULL,
  competencia text NOT NULL,
  tipo text NOT NULL,
  total_liquido numeric NOT NULL DEFAULT 0,
  CONSTRAINT legacy_header_key UNIQUE (empresa_id, competencia, tipo)
);
CREATE TABLE public.folha_itens (
  id uuid PRIMARY KEY,
  folha_id uuid NOT NULL,
  colaborador_id uuid NOT NULL,
  total_liquido numeric NOT NULL DEFAULT 0,
  CONSTRAINT legacy_item_key UNIQUE (folha_id, colaborador_id)
);
SQL

# The fixture intentionally uses legacy constraint names. The migration must
# recognize equivalent keys by columns and remain non-destructive/idempotent.
for pass in 1 2; do
  run_psql -f /tmp/p0-payroll-upsert.sql >/dev/null
  echo "migration pass $pass succeeded"
done

header_constraints="$(run_psql -Atc "SELECT count(*) FROM pg_constraint WHERE conrelid = 'public.folhas_pagamento'::regclass AND contype = 'u'")"
item_constraints="$(run_psql -Atc "SELECT count(*) FROM pg_constraint WHERE conrelid = 'public.folha_itens'::regclass AND contype = 'u'")"
[ "$header_constraints" = "1" ] || { echo "migration added redundant header unique constraint" >&2; exit 1; }
[ "$item_constraints" = "1" ] || { echo "migration added redundant item unique constraint" >&2; exit 1; }

run_psql <<'SQL'
INSERT INTO public.folhas_pagamento (id, empresa_id, competencia, tipo, total_liquido)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '2026-09', 'mensal', 100);
INSERT INTO public.folhas_pagamento (id, empresa_id, competencia, tipo, total_liquido)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', '2026-09', '13_primeiro', 100);
INSERT INTO public.folha_itens (id, folha_id, colaborador_id, total_liquido)
VALUES ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', 100);
INSERT INTO public.folha_itens (id, folha_id, colaborador_id, total_liquido)
VALUES ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020', 200)
ON CONFLICT (folha_id, colaborador_id) DO UPDATE SET total_liquido = EXCLUDED.total_liquido;
SQL

item_count="$(run_psql -Atc "SELECT count(*) FROM public.folha_itens WHERE folha_id = '00000000-0000-0000-0000-000000000001'")"
item_value="$(run_psql -Atc "SELECT total_liquido FROM public.folha_itens WHERE folha_id = '00000000-0000-0000-0000-000000000001' AND colaborador_id = '00000000-0000-0000-0000-000000000020'")"
[ "$item_count" = "1" ] && [ "$item_value" = "200" ] || {
  echo "item upsert contract did not update exactly one row: count=$item_count value=$item_value" >&2
  exit 1
}

run_psql -c 'CREATE DATABASE p0_payroll_missing_prerequisite' >/dev/null
expect_failure p0_payroll_missing_prerequisite 'requires public.folhas_pagamento and public.folha_itens'

run_psql -c 'CREATE DATABASE p0_payroll_duplicate_data' >/dev/null
run_psql_db p0_payroll_duplicate_data <<'SQL'
CREATE TABLE public.folhas_pagamento (id uuid PRIMARY KEY, empresa_id uuid NOT NULL, competencia text NOT NULL, tipo text NOT NULL);
CREATE TABLE public.folha_itens (id uuid PRIMARY KEY, folha_id uuid NOT NULL, colaborador_id uuid NOT NULL);
INSERT INTO public.folha_itens VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000020');
SQL
expect_failure p0_payroll_duplicate_data 'requires deduplicated folha_itens'

echo 'P0_PAYROLL_UPSERT_MIGRATION_OK: validated legacy-key recognition, idempotency, ON CONFLICT behavior and fail-closed preconditions.'
