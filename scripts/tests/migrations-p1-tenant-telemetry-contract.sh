#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$ROOT/supabase/migrations/20260912209000_p1_tenant_telemetry_contract.sql"
NAME="dp-p1-tenant-tel-$$"; IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
cleanup(){ docker rm -f "$NAME" >/dev/null 2>&1 || true; }; trap cleanup EXIT
psqlc(){ docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
bash "$ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"; docker cp "$MIGRATION" "$NAME":/tmp/m.sql
psqlc <<'SQL'
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE TABLE query_telemetry(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation text NOT NULL,
 table_name text, rpc_name text, duration_ms int NOT NULL, record_count int, query_limit int,
 query_offset int, count_mode text, severity text NOT NULL, error_message text, user_id uuid,
 created_at timestamptz DEFAULT now());
CREATE MATERIALIZED VIEW mv_telemetry_dashboard AS SELECT 1 marker;
SQL
for pass in 1 2; do psqlc -f /tmp/m.sql >/dev/null; echo "tenant telemetry pass $pass succeeded"; done
psqlc -qAtc "INSERT INTO query_telemetry(operation,table_name,duration_ms,severity,empresa_id) VALUES ('select','folha',100,'slow','10000000-0000-0000-0000-000000000001'),('select','folha',900,'slow','20000000-0000-0000-0000-000000000002'),('select','legacy',9999,'slow',NULL); SET ROLE service_role; SELECT refresh_telemetry_views();" >/dev/null
[ "$(psqlc -qAtc "SELECT count(*)||':'||max(p95_ms)::int FROM mv_telemetry_dashboard WHERE empresa_id='10000000-0000-0000-0000-000000000001'")" = '1:100' ] || { echo 'tenant 1 aggregate incorrect' >&2; exit 1; }
[ "$(psqlc -qAtc "SELECT count(*) FROM mv_telemetry_dashboard WHERE empresa_id IS NULL")" = 0 ] || { echo 'unattributed telemetry leaked into tenant MV' >&2; exit 1; }
[ "$(psqlc -qAtc "SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='query_telemetry' AND column_name='trace_id'")" = 'text' ] || { echo 'trace_id compatibility column missing' >&2; exit 1; }
set +e; denied="$(psqlc -c 'SET ROLE authenticated; SELECT * FROM query_telemetry;' 2>&1)"; status=$?; set -e
[ "$status" -ne 0 ] && [[ "$denied" == *'permission denied'* ]] || { echo 'authenticated read telemetry' >&2; exit 1; }
echo 'P1_TENANT_TELEMETRY_OK: attribution column, separated MV, legacy exclusion, ACL and idempotency passed.'
