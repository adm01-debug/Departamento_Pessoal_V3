#!/usr/bin/env bash
# Validates atomic report-schedule claims in disposable PostgreSQL.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260912192000_p0_report_schedule_claims.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p0-report-claims-$$"
RESULT_DIR="$(mktemp -d)"

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
test -f "$MIGRATION" || { echo "migration not found: $MIGRATION" >&2; exit 1; }

cleanup() {
  [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true
  rm -rf "$RESULT_DIR"
}
trap cleanup EXIT

run_psql() {
  docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"
}

echo "Starting disposable $IMAGE database: $NAME"
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"
docker cp "$MIGRATION" "$NAME":/tmp/p0-report-claims.sql

run_psql <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE TABLE public.relatorios_agendados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo_relatorio text NOT NULL,
  formato text NOT NULL DEFAULT 'csv',
  parametros jsonb,
  email_destinatario text NOT NULL,
  frequencia text NOT NULL,
  dia_semana integer,
  dia_mes integer,
  hora_envio time NOT NULL,
  ativo boolean DEFAULT true,
  ultimo_envio timestamptz,
  proximo_envio timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
SQL

for pass in 1 2; do
  run_psql -f /tmp/p0-report-claims.sql >/dev/null
  echo "migration pass $pass succeeded"
done

signature='public.claim_due_report_schedules(timestamp with time zone, integer)'
[ "$(run_psql -Atc "SELECT has_function_privilege('anon', '$signature', 'EXECUTE')")" = 'f' ]
[ "$(run_psql -Atc "SELECT has_function_privilege('authenticated', '$signature', 'EXECUTE')")" = 'f' ]
[ "$(run_psql -Atc "SELECT has_function_privilege('service_role', '$signature', 'EXECUTE')")" = 't' ]

schedule_id="$(run_psql -qAtc "INSERT INTO public.relatorios_agendados
  (nome,tipo_relatorio,email_destinatario,frequencia,hora_envio,proximo_envio)
  VALUES ('Concorrente','folha_resumo','rh@example.test','diario','09:00',now()-interval '1 minute')
  RETURNING id")"

# Twenty independent transactions race for one schedule. SKIP LOCKED plus the
# lease predicate must return the row exactly once.
pids=()
for i in $(seq 1 20); do
  docker exec "$NAME" psql -X -qAt -U postgres -v ON_ERROR_STOP=1 -c \
    "SET ROLE service_role; SELECT id FROM public.claim_due_report_schedules(now(), 1);" \
    >"$RESULT_DIR/$i" &
  pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid" || { echo "concurrent schedule-claim process failed" >&2; exit 1; }; done
[ "$(grep -h -c "$schedule_id" "$RESULT_DIR"/* | awk '{s += $1} END {print s+0}')" = '1' ] || {
  echo 'concurrent claim returned the same schedule more than once' >&2; exit 1;
}

claim_token="$(run_psql -Atc "SELECT dispatch_claim_token FROM public.relatorios_agendados WHERE id='$schedule_id'")"
[ -n "$claim_token" ]
[ "$(run_psql -qAtc "SET ROLE service_role; SELECT public.finish_report_schedule_claim('$schedule_id', gen_random_uuid(), now()+interval '1 day')")" = 'f' ]
[ "$(run_psql -qAtc "SET ROLE service_role; SELECT public.finish_report_schedule_claim('$schedule_id', '$claim_token', now()+interval '1 day')")" = 't' ]
[ "$(run_psql -Atc "SELECT dispatch_claim_token IS NULL AND proximo_envio > now() FROM public.relatorios_agendados WHERE id='$schedule_id'")" = 't' ]

# A crashed worker's lease becomes reclaimable only after five minutes.
run_psql -c "UPDATE public.relatorios_agendados SET proximo_envio=now()-interval '1 minute', dispatch_claim_token=gen_random_uuid(), dispatch_claimed_at=now()-interval '6 minutes' WHERE id='$schedule_id'" >/dev/null
[ "$(run_psql -qAtc "SET ROLE service_role; SELECT count(*) FROM public.claim_due_report_schedules(now(), 1)")" = '1' ]

run_psql -c 'CREATE DATABASE p0_report_claims_missing_prerequisite' >/dev/null
set +e
failure="$(docker exec -i "$NAME" psql -X -U postgres -d p0_report_claims_missing_prerequisite -v ON_ERROR_STOP=1 -f /tmp/p0-report-claims.sql 2>&1)"
status=$?
set -e
if [ "$status" -eq 0 ] || [[ "$failure" != *'require public.relatorios_agendados'* ]]; then
  echo 'migration did not fail closed without prerequisite table' >&2
  echo "$failure" >&2
  exit 1
fi

echo 'P0_REPORT_SCHEDULE_CLAIMS_OK: ACL, idempotency, 20-way claim concurrency, lease recovery, token ownership and preflight validated.'
