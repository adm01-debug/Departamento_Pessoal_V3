#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260912201000_p1_internal_notification_recipients.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p1-notification-recipients-$$"
cleanup() { [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
run_psql() { docker exec "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"
docker cp "$MIGRATION" "$NAME":/tmp/migration.sql
docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TYPE public.app_role AS ENUM ('admin','rh','gestor','colaborador');
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text);
CREATE TABLE public.user_empresas(user_id uuid, empresa_id uuid, PRIMARY KEY(user_id,empresa_id));
CREATE TABLE public.user_roles(user_id uuid, role public.app_role, PRIMARY KEY(user_id,role));
INSERT INTO auth.users VALUES
('00000000-0000-4000-8000-000000000001','rh@t1.test'),
('00000000-0000-4000-8000-000000000002','member@t1.test'),
('00000000-0000-4000-8000-000000000003','admin@t2.test');
INSERT INTO public.user_empresas VALUES
('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),
('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001'),
('00000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002');
INSERT INTO public.user_roles VALUES
('00000000-0000-4000-8000-000000000001','rh'),
('00000000-0000-4000-8000-000000000002','colaborador'),
('00000000-0000-4000-8000-000000000003','admin');
SQL

for pass in 1 2; do run_psql -f /tmp/migration.sql >/dev/null; done
signature='public.get_company_rh_recipient_emails(uuid, integer)'
[ "$(run_psql -Atc "SELECT has_function_privilege('anon','$signature','EXECUTE')")" = 'f' ]
[ "$(run_psql -Atc "SELECT has_function_privilege('authenticated','$signature','EXECUTE')")" = 'f' ]
[ "$(run_psql -Atc "SELECT has_function_privilege('service_role','$signature','EXECUTE')")" = 't' ]

recipients="$(run_psql -qAtc "SET ROLE service_role; SELECT user_id::text||':'||email FROM public.get_company_rh_recipient_emails('10000000-0000-4000-8000-000000000001',50)")"
[ "$recipients" = '00000000-0000-4000-8000-000000000001:rh@t1.test' ] || { echo "recipient scope failed: $recipients" >&2; exit 1; }

set +e
denied="$(run_psql -c "SET ROLE authenticated; SELECT * FROM public.get_company_rh_recipient_emails('10000000-0000-4000-8000-000000000001',50);" 2>&1)"
status=$?
set -e
[ "$status" -ne 0 ] && [[ "$denied" == *'permission denied'* ]] || { echo 'authenticated caller reached recipient RPC' >&2; exit 1; }

run_psql -c 'CREATE DATABASE missing_recipient_dependencies' >/dev/null
set +e
missing="$(docker exec "$NAME" psql -X -U postgres -d missing_recipient_dependencies -v ON_ERROR_STOP=1 -f /tmp/migration.sql 2>&1)"
status=$?
set -e
[ "$status" -ne 0 ] && [[ "$missing" == *'require auth.users'* ]] || { echo 'preflight did not fail closed' >&2; exit 1; }

echo 'P1_INTERNAL_NOTIFICATION_RECIPIENTS_OK: role, tenant, ACL, limit, idempotency and preflight passed.'
