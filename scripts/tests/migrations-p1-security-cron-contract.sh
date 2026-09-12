#!/usr/bin/env bash
# Validates the repaired internal security scanners and their exact cron jobs.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260912203000_p1_security_cron_contract.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p1-security-cron-$$"

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
run_psql() { docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
for attempt in $(seq 1 60); do
  if docker exec "$NAME" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  if [ "$attempt" -eq 60 ]; then docker logs "$NAME" >&2; exit 1; fi
  sleep 1
done
docker cp "$MIGRATION" "$NAME":/tmp/p1-security-cron.sql

run_psql <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $$ SELECT _user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid $$;
CREATE TABLE public.historico_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tipo text NOT NULL,
  nivel text NOT NULL, valor numeric NOT NULL, limite numeric NOT NULL,
  mensagem text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION public.sec_audit_policies()
RETURNS TABLE(tabela text,policy_name text,cmd text,motivo text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $$ SELECT NULL::text,NULL::text,NULL::text,NULL::text WHERE false $$;
CREATE FUNCTION public.sec_verify_seals()
RETURNS TABLE(tabela text,selados bigint,divergentes bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $$ VALUES ('folhas_pagamento'::text,3::bigint,1::bigint),('ferias'::text,2::bigint,0::bigint) $$;
CREATE SCHEMA cron;
CREATE TABLE cron.job (
  jobid bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  jobname text NOT NULL UNIQUE, schedule text NOT NULL, command text NOT NULL
);
CREATE FUNCTION cron.unschedule(_jobid bigint) RETURNS boolean LANGUAGE plpgsql
AS $$ BEGIN DELETE FROM cron.job WHERE jobid=_jobid; RETURN FOUND; END $$;
CREATE FUNCTION cron.schedule(_name text,_schedule text,_command text) RETURNS bigint LANGUAGE plpgsql
AS $$ DECLARE result bigint; BEGIN INSERT INTO cron.job(jobname,schedule,command)
VALUES (_name,_schedule,_command) RETURNING jobid INTO result; RETURN result; END $$;
CREATE TABLE public.unprotected_fixture(id integer);
ALTER TABLE public.unprotected_fixture ENABLE ROW LEVEL SECURITY;
CREATE POLICY fixture_open ON public.unprotected_fixture FOR SELECT TO authenticated USING (true);
SQL

for pass in 1 2; do
  run_psql -f /tmp/p1-security-cron.sql >/dev/null
  echo "security cron migration pass $pass succeeded"
done

jobs="$(run_psql -qAtc "SELECT count(*) FROM cron.job WHERE jobname LIKE 'sec-%'")"
[ "$jobs" = '3' ] || { echo "expected exactly three security jobs, got $jobs" >&2; exit 1; }

scan="$(run_psql -qAt <<'SQL'
SET ROLE service_role;
SELECT public.sec_audit_policies_scan()->>'achados';
SQL
)"
[ "$scan" = '1' ] || { echo "cron-context policy scan did not find the open policy: $scan" >&2; exit 1; }
regressions="$(run_psql -qAtc 'SELECT count(*) FROM public.sec_policy_regressions')"
[ "$regressions" = '1' ] || { echo "policy regression was not persisted" >&2; exit 1; }

seal_result="$(run_psql -qAt <<'SQL'
SET ROLE service_role;
SELECT public.sec_verify_seals_scan()->>'divergentes';
SQL
)"
[ "$seal_result" = '1' ] || { echo "seal divergence was not reported: $seal_result" >&2; exit 1; }
alerts="$(run_psql -qAtc "SELECT count(*) FROM public.historico_alertas WHERE tipo IN ('seguranca_rls','integridade_selos')")"
[ "$alerts" = '2' ] || { echo "security alerts were not persisted: $alerts" >&2; exit 1; }

run_psql -qAtc "INSERT INTO public.sec_policy_regressions(scan_at,tabela,policy_name,motivo) VALUES (now()-interval '181 days','old','old','old')" >/dev/null
purged="$(run_psql -qAt <<'SQL'
SET ROLE service_role;
SELECT public.sec_policy_regressions_purge();
SQL
)"
[ "$purged" = '1' ] || { echo "retention purge failed: $purged" >&2; exit 1; }

set +e
anon_output="$(run_psql -c 'SET ROLE anon; SELECT public.sec_audit_policies_scan();' 2>&1)"
anon_status=$?
set -e
[ "$anon_status" -ne 0 ] && [[ "$anon_output" == *'permission denied'* ]] || {
  echo "anon unexpectedly executed the internal scanner" >&2; exit 1;
}

admin_visible="$(run_psql -qAt <<'SQL'
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false) AS ignored \gset
SELECT count(*) FROM public.sec_policy_regressions;
SQL
)"
[ "$admin_visible" = '1' ] || { echo "admin cannot read security evidence" >&2; exit 1; }

member_visible="$(run_psql -qAt <<'SQL'
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',false) AS ignored \gset
SELECT count(*) FROM public.sec_policy_regressions;
SQL
)"
[ "$member_visible" = '0' ] || { echo "non-admin read internal security evidence" >&2; exit 1; }

run_psql -c 'CREATE DATABASE cron_missing_prerequisites' >/dev/null
set +e
missing="$(docker exec -i "$NAME" psql -X -U postgres -d cron_missing_prerequisites -v ON_ERROR_STOP=1 -f /tmp/p1-security-cron.sql 2>&1)"
missing_status=$?
set -e
[ "$missing_status" -ne 0 ] && [[ "$missing" == *'requires historico_alertas and pg_cron'* ]] || {
  echo "security cron missing-prerequisite preflight failed" >&2; exit 1;
}

echo 'P1_SECURITY_CRON_CONTRACT_OK: exact jobs, cron-context policy detection, seal divergence, retention, ACL/RLS, idempotency and preflight passed.'
