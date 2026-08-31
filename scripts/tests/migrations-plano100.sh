#!/usr/bin/env bash
# ============================================================================
# PLANO_100 · Runner de validação das migrations em Postgres real
# Sobe postgres:17-alpine (docker), aplica stubs Supabase + drift simulado +
# as migrations 20260830*_plano100_* (2 passes = idempotência) e a suíte de
# asserts comportamentais. Qualquer falha → exit ≠ 0.
# Uso: bash scripts/tests/migrations-plano100.sh
# Vars: MIGTEST_IMAGE (default postgres:17-alpine), MIGTEST_KEEP=1 p/ inspecionar
# ============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-migtest-$$"
FIXTURES="$REPO_ROOT/supabase/tests/plano100"
MIGS=$(ls "$REPO_ROOT"/supabase/migrations/2026083*_plano100_*.sql 2>/dev/null | sort)

[ -n "$MIGS" ] || { echo "❌ nenhuma migration plano100 encontrada"; exit 1; }
command -v docker >/dev/null || { echo "❌ docker necessário"; exit 1; }

cleanup() { [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "── Container $IMAGE ($NAME)"
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
for i in $(seq 1 30); do
  docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1 || { echo "❌ postgres não subiu"; exit 1; }

run_sql() { # arquivo, rótulo
  docker cp "$1" "$NAME":/tmp/x.sql >/dev/null
  if docker exec "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q -f /tmp/x.sql >/dev/null 2>/tmp/migtest_err.log; then
    echo "✅ $2"
  else
    echo "❌ $2"; cat /tmp/migtest_err.log >&2; exit 1
  fi
}

echo "── Stubs Supabase + drift simulado"
run_sql "$FIXTURES/00_setup_stubs.sql" "setup"

for pass in 1 2; do
  for m in $MIGS; do
    run_sql "$m" "pass$pass: $(basename "$m")"
  done
done

echo "── Asserts comportamentais"
docker cp "$FIXTURES/20_asserts.sql" "$NAME":/tmp/a.sql >/dev/null
if docker exec "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/a.sql > /tmp/migtest_asserts.log 2>&1; then
  grep -q 'PLANO100_ASSERTS_OK' /tmp/migtest_asserts.log \
    || { echo "❌ marcador PLANO100_ASSERTS_OK ausente"; exit 1; }
  echo "✅ $(grep -o 'PLANO100_ASSERTS_OK.*' /tmp/migtest_asserts.log)"
else
  echo "❌ asserts falharam:"; tail -25 /tmp/migtest_asserts.log >&2; exit 1
fi
echo "✅ MIGTEST_OK"
