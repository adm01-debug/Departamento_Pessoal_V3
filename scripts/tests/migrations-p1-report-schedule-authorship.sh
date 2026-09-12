#!/usr/bin/env bash
# Validates server-owned schedule authorship and tenant-bound destinations.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260912194000_p1_report_schedule_authorship.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p1-schedule-authorship-$$"

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
cleanup() { [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
run_psql() { docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }

echo "Starting disposable $IMAGE database: $NAME"
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
for _ in $(seq 1 60); do
  docker exec "$NAME" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$NAME" pg_isready -h 127.0.0.1 -U postgres >/dev/null
docker cp "$MIGRATION" "$NAME":/tmp/p1-schedule-authorship.sql

run_psql <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.user_empresas (user_id uuid NOT NULL, empresa_id uuid NOT NULL);
CREATE TABLE public.test_roles (user_id uuid NOT NULL, role text NOT NULL);
CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.test_roles WHERE user_id=_user_id AND role='admin')
$$;
CREATE FUNCTION public.pode_gerir_rh(_empresa_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_empresas ue JOIN public.test_roles tr USING (user_id)
    WHERE ue.user_id=auth.uid() AND ue.empresa_id=_empresa_id AND tr.role IN ('rh','admin')
  )
$$;
CREATE TABLE public.relatorios_agendados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL,
  tipo_relatorio text NOT NULL, formato text NOT NULL DEFAULT 'csv', parametros jsonb,
  email_destinatario text NOT NULL, frequencia text NOT NULL, dia_semana integer,
  dia_mes integer, hora_envio time NOT NULL, ativo boolean DEFAULT true,
  ultimo_envio timestamptz, proximo_envio timestamptz, created_at timestamptz DEFAULT now(),
  created_by uuid, updated_at timestamptz DEFAULT now(), empresa_id uuid NOT NULL,
  dispatch_claim_token uuid, dispatch_claimed_at timestamptz
);
ALTER TABLE public.relatorios_agendados ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorios_agendados TO authenticated;
GRANT SELECT ON public.user_empresas, public.test_roles TO authenticated;
INSERT INTO public.user_empresas VALUES
 ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000014','00000000-0000-4000-8000-000000000002');
INSERT INTO public.test_roles VALUES
 ('00000000-0000-4000-8000-000000000011','colaborador'),
 ('00000000-0000-4000-8000-000000000012','rh');
INSERT INTO auth.users VALUES
 ('00000000-0000-4000-8000-000000000013','destino@empresa.test'),
 ('00000000-0000-4000-8000-000000000014','externo@outra.test');
SQL

for pass in 1 2; do
  run_psql -f /tmp/p1-schedule-authorship.sql >/dev/null
  echo "migration pass $pass succeeded"
done

destination_signature='public.report_destination_is_allowed(text, uuid)'
[ "$(run_psql -Atc "SELECT has_function_privilege('authenticated', '$destination_signature', 'EXECUTE')")" = 'f' ]
[ "$(run_psql -Atc "SELECT has_function_privilege('service_role', '$destination_signature', 'EXECUTE')")" = 't' ]
[ "$(run_psql -qAtc "SET ROLE service_role; SELECT public.report_destination_is_allowed('destino@empresa.test','00000000-0000-4000-8000-000000000001')")" = 't' ]
[ "$(run_psql -qAtc "SET ROLE service_role; SELECT public.report_destination_is_allowed('externo@outra.test','00000000-0000-4000-8000-000000000001')")" = 'f' ]

insert_sql="INSERT INTO public.relatorios_agendados
  (nome,tipo_relatorio,email_destinatario,frequencia,hora_envio,empresa_id,created_by,parametros)
  VALUES ('Teste','folha_resumo','destino@empresa.test','diario','09:00',
  '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000099',
  '{\"empresaId\":\"00000000-0000-4000-8000-000000000002\"}') RETURNING id"

set +e
member_failure="$(run_psql -qAtc "SET ROLE authenticated; SET \"request.jwt.claim.sub\"='00000000-0000-4000-8000-000000000011'; $insert_sql" 2>&1)"
member_status=$?
set -e
if [ "$member_status" -eq 0 ] || [[ "$member_failure" != *'requires RH authorization'* ]]; then
  echo 'ordinary member forged a report schedule' >&2; exit 1
fi

schedule_id="$(run_psql -qAtc "SET ROLE authenticated; SET \"request.jwt.claim.sub\"='00000000-0000-4000-8000-000000000012'; $insert_sql")"
[ -n "$schedule_id" ]
[ "$(run_psql -Atc "SELECT created_by::text || ':' || (parametros->>'empresaId') FROM public.relatorios_agendados WHERE id='$schedule_id'")" = '00000000-0000-4000-8000-000000000012:00000000-0000-4000-8000-000000000001' ]

run_psql -qAtc "SET ROLE authenticated; SET \"request.jwt.claim.sub\"='00000000-0000-4000-8000-000000000012';
  UPDATE public.relatorios_agendados SET created_by='00000000-0000-4000-8000-000000000099' WHERE id='$schedule_id';" >/dev/null
[ "$(run_psql -Atc "SELECT created_by FROM public.relatorios_agendados WHERE id='$schedule_id'")" = '00000000-0000-4000-8000-000000000012' ]

set +e
outside_failure="$(run_psql -qAtc "SET ROLE authenticated; SET \"request.jwt.claim.sub\"='00000000-0000-4000-8000-000000000012';
  UPDATE public.relatorios_agendados SET email_destinatario='externo@outra.test' WHERE id='$schedule_id';" 2>&1)"
outside_status=$?
set -e
if [ "$outside_status" -eq 0 ] || [[ "$outside_failure" != *'destination is outside'* ]]; then
  echo 'RH redirected a report outside the tenant' >&2; exit 1
fi
[ "$(run_psql -Atc "SELECT email_destinatario FROM public.relatorios_agendados WHERE id='$schedule_id'")" = 'destino@empresa.test' ]

run_psql -c 'CREATE DATABASE p1_schedule_authorship_missing_prerequisite' >/dev/null
set +e
failure="$(docker exec -i "$NAME" psql -X -U postgres -d p1_schedule_authorship_missing_prerequisite -v ON_ERROR_STOP=1 -f /tmp/p1-schedule-authorship.sql 2>&1)"
status=$?
set -e
if [ "$status" -eq 0 ] || [[ "$failure" != *'requires schedules, auth users, membership and authorization RPCs'* ]]; then
  echo 'migration did not fail closed without prerequisites' >&2; exit 1
fi

echo 'P1_REPORT_SCHEDULE_AUTHORSHIP_OK: non-RH denial, forged-author overwrite, immutable author, tenant-derived parameters, destination isolation, idempotency and preflight validated.'
