#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$ROOT/supabase/migrations/20260912207000_p1_idempotency_monitoring_contract.sql"
NAME="dp-p1-idem-monitor-$$"; IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
cleanup(){ docker rm -f "$NAME" >/dev/null 2>&1 || true; }; trap cleanup EXIT
psqlc(){ docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
bash "$ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"; docker cp "$MIGRATION" "$NAME":/tmp/m.sql
psqlc <<'SQL'
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE TABLE idempotency_keys(id uuid DEFAULT gen_random_uuid(), endpoint text, status text,
  created_at timestamptz DEFAULT now(), expires_at timestamptz DEFAULT now()+interval '1 day');
CREATE TABLE security_alerts(id uuid DEFAULT gen_random_uuid(), type text, severity text,
  details jsonb, resolved boolean DEFAULT false, created_at timestamptz DEFAULT now());
CREATE VIEW v_idempotency_metrics AS SELECT 'none'::text endpoint, 0::int total_24h,
  0::int failed_24h, 0::numeric failure_rate_pct_24h;
INSERT INTO idempotency_keys(endpoint,status,created_at) VALUES
 ('folha','in_progress',now()-interval '6 minutes'),('cnab','completed',now()-interval '1 hour');
SQL
for pass in 1 2; do psqlc -f /tmp/m.sql >/dev/null; echo "idempotency monitor pass $pass succeeded"; done
result="$(psqlc -qAtc "SET ROLE service_role; SELECT endpoint||':'||severity FROM public.check_idempotency_anomalies();")"
[ "$result" = 'folha:medium' ] || { echo "stale in_progress not reported: $result" >&2; exit 1; }
[ "$(psqlc -qAtc "SELECT count(*) FROM security_alerts WHERE type='IDEMPOTENCY_STALE_IN_PROGRESS'")" = 1 ] || exit 1
[ -z "$(psqlc -qAtc "SET ROLE service_role; SELECT endpoint FROM public.check_idempotency_anomalies();")" ] || { echo 'alert dedupe failed' >&2; exit 1; }
set +e; denied="$(psqlc -c 'SET ROLE authenticated; SELECT public.check_idempotency_anomalies();' 2>&1)"; status=$?; set -e
[ "$status" -ne 0 ] && [[ "$denied" == *'permission denied'* ]] || { echo 'authenticated executed monitor' >&2; exit 1; }
echo 'P1_IDEMPOTENCY_MONITORING_OK: runtime state, threshold, dedupe, ACL and idempotency passed.'
