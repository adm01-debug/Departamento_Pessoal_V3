#!/usr/bin/env bash
# Proves that anonymous acknowledgement works through RPCs, never table access.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260912191000_p0_token_table_acl.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p0-token-acl-$$"

cleanup() { [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
ready=0
for _ in $(seq 1 60); do
  if docker exec "$NAME" psql -X -h 127.0.0.1 -U postgres -qAtc 'SELECT 1' 2>/dev/null | grep -qx '1'; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  echo "PostgreSQL did not accept a real SQL query within 60 seconds" >&2
  docker logs "$NAME" >&2 || true
  exit 1
fi
docker cp "$MIGRATION" "$NAME":/tmp/p0-token-acl.sql

docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE TABLE public.medidas_ciencia_tokens(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash text NOT NULL,
  used_at timestamptz, expires_at timestamptz NOT NULL
);
ALTER TABLE public.medidas_ciencia_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Validação pública por token (anon consulta)" ON public.medidas_ciencia_tokens
FOR SELECT TO anon USING (used_at IS NULL AND expires_at > now());
CREATE POLICY "Registro público de ciência via token" ON public.medidas_ciencia_tokens
FOR UPDATE TO anon USING (used_at IS NULL AND expires_at > now()) WITH CHECK (used_at IS NOT NULL);
GRANT SELECT, UPDATE ON public.medidas_ciencia_tokens TO anon, authenticated;
INSERT INTO public.medidas_ciencia_tokens(token_hash,expires_at) VALUES('secret-hash',now()+interval '1 day');

CREATE OR REPLACE FUNCTION public.medida_consultar_por_token(p_token text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public
AS $$ SELECT jsonb_build_object('valid',EXISTS(SELECT 1 FROM public.medidas_ciencia_tokens WHERE token_hash=p_token AND used_at IS NULL)) $$;
CREATE OR REPLACE FUNCTION public.medida_registrar_ciencia_publica(
  p_token text,p_acao text,p_motivo_recusa text DEFAULT NULL,p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,p_geo jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public
AS $$ SELECT jsonb_build_object('success',EXISTS(SELECT 1 FROM public.medidas_ciencia_tokens WHERE token_hash=p_token AND used_at IS NULL)) $$;
SQL

before="$(docker exec "$NAME" psql -X -qAt -U postgres -c 'SET ROLE anon; SELECT count(*) FROM public.medidas_ciencia_tokens;')"
[ "$before" = "1" ] || { echo "fixture did not expose active token row" >&2; exit 1; }

for pass in 1 2; do
  docker exec "$NAME" psql -X -q -U postgres -v ON_ERROR_STOP=1 -f /tmp/p0-token-acl.sql
  echo "token ACL migration pass $pass succeeded"
done

set +e
direct="$(docker exec "$NAME" psql -X -U postgres -c 'SET ROLE anon; SELECT count(*) FROM public.medidas_ciencia_tokens;' 2>&1)"
status=$?
set -e
if [ "$status" -eq 0 ] || [[ "$direct" != *"permission denied"* ]]; then
  echo "anonymous direct table access was not denied" >&2
  echo "$direct" >&2
  exit 1
fi

set +e
authenticated_direct="$(docker exec "$NAME" psql -X -U postgres -c 'SET ROLE authenticated; SELECT count(*) FROM public.medidas_ciencia_tokens;' 2>&1)"
authenticated_status=$?
set -e
if [ "$authenticated_status" -eq 0 ] || [[ "$authenticated_direct" != *"permission denied"* ]]; then
  echo "authenticated direct table access was not denied" >&2
  echo "$authenticated_direct" >&2
  exit 1
fi

lookup="$(docker exec "$NAME" psql -X -qAt -U postgres -c "SET ROLE anon; SELECT public.medida_consultar_por_token('secret-hash')->>'valid';")"
[ "$lookup" = "true" ] || { echo "public RPC no longer works: $lookup" >&2; exit 1; }

docker exec "$NAME" psql -X -U postgres -c 'CREATE DATABASE p0_token_missing_prerequisite' >/dev/null
set +e
missing="$(docker exec "$NAME" psql -X -U postgres -d p0_token_missing_prerequisite -v ON_ERROR_STOP=1 -f /tmp/p0-token-acl.sql 2>&1)"
status=$?
set -e
if [ "$status" -eq 0 ] || [[ "$missing" != *"requires public.medidas_ciencia_tokens"* ]]; then
  echo "missing prerequisite did not fail closed" >&2
  exit 1
fi

echo 'P0_TOKEN_TABLE_ACL_OK: reproduced anonymous enumeration, then validated direct denial, RPC availability, idempotency and preflight.'
