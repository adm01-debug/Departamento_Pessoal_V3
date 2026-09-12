#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$ROOT/supabase/migrations/20260912208000_p1_company_payroll_tax_contract.sql"
NAME="dp-p1-tax-contract-$$"; IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
cleanup(){ docker rm -f "$NAME" >/dev/null 2>&1 || true; }; trap cleanup EXIT
psqlc(){ docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }
reject(){ local sql="$1"; set +e; psqlc -c "$sql" >/dev/null 2>&1; local s=$?; set -e; [ "$s" -ne 0 ] || { echo "expected rejection: $sql" >&2; exit 1; }; }
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
bash "$ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"; docker cp "$MIGRATION" "$NAME":/tmp/m.sql
psqlc <<'SQL'
CREATE TABLE empresas(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), regime_tributario varchar(50),
  rat numeric, fap numeric, terceiros numeric);
INSERT INTO empresas(regime_tributario,rat,fap,terceiros) VALUES
  ('simples nacional',2,1,5.8),(NULL,NULL,NULL,NULL),('lucro real',1,1,1);
SQL
for pass in 1 2; do psqlc -f /tmp/m.sql >/dev/null; echo "company tax contract pass $pass succeeded"; done
[ "$(psqlc -qAtc "SELECT count(*) FROM empresas WHERE regime_tributario='lucro_real' AND rat=0.02 AND fap=1 AND terceiros=0.058")" = '1' ] || { echo 'defaults not normalized' >&2; exit 1; }
[ "$(psqlc -qAtc "SELECT count(*) FROM empresas WHERE regime_tributario='simples_nacional' AND rat=0.02 AND terceiros=0.058")" = '1' ] || { echo 'legacy points not normalized' >&2; exit 1; }
[ "$(psqlc -qAtc "SELECT count(*) FROM empresas WHERE regime_tributario='lucro_real' AND rat=0.01 AND terceiros=0.01")" = '1' ] || { echo 'one-percent legacy points not normalized' >&2; exit 1; }
[ "$(psqlc -qAtc "SELECT udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name='empresas' AND column_name='regime_tributario'")" = 'regime_tributario' ] || exit 1
reject "INSERT INTO empresas(regime_tributario,rat,fap,terceiros) VALUES ('mei',1.1,1,0.058)"
reject "INSERT INTO empresas(regime_tributario,rat,fap,terceiros) VALUES ('mei',0.031,1,0.058)"
reject "INSERT INTO empresas(regime_tributario,rat,fap,terceiros) VALUES ('mei',0.02,1,0.201)"
reject "INSERT INTO empresas(regime_tributario,rat,fap,terceiros,simples_anexo) VALUES ('simples_nacional',0.02,1,0.058,'VI')"
echo 'P1_COMPANY_PAYROLL_TAX_OK: legacy normalization, enum, defaults, bounds and idempotency passed.'
