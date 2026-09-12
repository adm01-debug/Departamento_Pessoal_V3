#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260912206000_p1_audit_action_contract.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p1-audit-actions-$$"

cleanup() {
  [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT
run_psql() { docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"
docker cp "$MIGRATION" "$NAME":/tmp/migration.sql

run_psql <<'SQL'
CREATE TABLE public.audit_log(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao text NOT NULL,
  CONSTRAINT audit_log_acao_check CHECK (acao IN ('INSERT','UPDATE','DELETE'))
);
INSERT INTO public.audit_log(acao) VALUES ('INSERT');
SQL

for pass in 1 2; do
  run_psql -f /tmp/migration.sql >/dev/null
  echo "audit action migration pass $pass succeeded"
done

run_psql <<'SQL' >/dev/null
INSERT INTO public.audit_log(acao)
SELECT unnest(ARRAY[
  'INSERT', 'UPDATE', 'DELETE',
  'PAYROLL_CALC', 'PAYROLL_CALC_BLOCKED', 'PAYROLL_CLOSE', 'PAYROLL_REOPEN',
  'FERIAS_CALC', 'FERIAS_CANCEL', 'RESCISAO_CALC', 'PROVISOES_CALC',
  'ESOCIAL_SEND', 'DECIMO_CALC', 'IDEMPOTENCY_REPLAY', 'IDEMPOTENCY_CONFLICT',
  'BACKUP_CREATED', 'BACKUP_FAILED', 'SYSTEM_ACTION', 'AUTH_ACTION',
  'EXPORT', 'IMPORT', 'VISUALIZACAO', 'EXECUTE_CALC', 'SIGN', 'STATUS_CHANGE'
]::text[]);
SQL

set +e
invalid="$(run_psql -c "INSERT INTO public.audit_log(acao) VALUES ('UNREVIEWED_ACTION');" 2>&1)"
status=$?
set -e
[ "$status" -ne 0 ] && [[ "$invalid" == *'audit_log_acao_check'* ]] || {
  echo 'audit action constraint accepted an unreviewed value' >&2
  exit 1
}

[ "$(run_psql -qAtc "SELECT convalidated FROM pg_constraint WHERE conrelid='public.audit_log'::regclass AND conname='audit_log_acao_check';")" = 't' ] || {
  echo 'audit action constraint is not validated' >&2
  exit 1
}

run_psql -c 'CREATE DATABASE missing_audit_action' >/dev/null
set +e
missing="$(docker exec -i "$NAME" psql -X -U postgres -d missing_audit_action -v ON_ERROR_STOP=1 -f /tmp/migration.sql 2>&1)"
status=$?
set -e
[ "$status" -ne 0 ] && [[ "$missing" == *'requires public.audit_log'* ]] || {
  echo 'audit action preflight did not fail closed' >&2
  exit 1
}

echo 'P1_AUDIT_ACTION_CONTRACT_OK: all reviewed actions accepted, unknown denied, idempotency and preflight passed.'
