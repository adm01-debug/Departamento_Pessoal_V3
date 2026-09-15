#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$ROOT/supabase/migrations/20260912210000_p1_report_dispatch_idempotency.sql"
NAME="dp-p1-report-idem-$$"; IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
cleanup(){ docker rm -f "$NAME" >/dev/null 2>&1 || true; }; trap cleanup EXIT
psqlc(){ docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
bash "$ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"; docker cp "$MIGRATION" "$NAME":/tmp/m.sql
psqlc <<'SQL'
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE TABLE relatorios_agendados(id uuid PRIMARY KEY DEFAULT gen_random_uuid());
INSERT INTO relatorios_agendados VALUES ('10000000-0000-0000-0000-000000000001');
SQL
for pass in 1 2; do psqlc -f /tmp/m.sql >/dev/null; echo "report dispatch contract pass $pass succeeded"; done
psqlc -qAtc "SET ROLE service_role; INSERT INTO report_dispatch_attempts(dispatch_key_hash,request_hash,agendamento_id,empresa_id,storage_path,signed_url,signed_url_expires_at,subject,html,content_sha256,total_registros) VALUES (repeat('a',64),repeat('b',64),'10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','p','https://signed',now()+interval '1 day','s','h',repeat('c',64),1);" >/dev/null
set +e; duplicate="$(psqlc -c "SET ROLE service_role; INSERT INTO report_dispatch_attempts(dispatch_key_hash,request_hash,agendamento_id,empresa_id,storage_path,signed_url,signed_url_expires_at,subject,html,content_sha256,total_registros) VALUES (repeat('a',64),repeat('d',64),'10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','x','x',now()+interval '1 day','x','x',repeat('e',64),1);" 2>&1)"; status=$?; set -e
[ "$status" -ne 0 ] && [[ "$duplicate" == *'duplicate key'* ]] || { echo 'dispatch key was reusable' >&2; exit 1; }
set +e; denied="$(psqlc -c 'SET ROLE authenticated; SELECT * FROM report_dispatch_attempts;' 2>&1)"; status=$?; set -e
[ "$status" -ne 0 ] && [[ "$denied" == *'permission denied'* ]] || { echo 'authenticated read provider payload' >&2; exit 1; }
echo 'P1_REPORT_DISPATCH_IDEMPOTENCY_OK: exact payload persistence, unique key, ACL and idempotency passed.'
