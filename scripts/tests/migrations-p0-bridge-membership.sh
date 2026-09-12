#!/usr/bin/env bash
# Exercises the JWT-scoped user_empresas RPC contract in disposable PostgreSQL.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260911200000_p0_bridge_membership_authorization.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p0-bridge-membership-$$"
RESULT_DIR="$(mktemp -d)"

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
test -f "$MIGRATION" || { echo "migration not found: $MIGRATION" >&2; exit 1; }

cleanup() {
  [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true
  rm -rf "$RESULT_DIR"
}
trap cleanup EXIT

run_psql() {
  if [ "$#" -eq 0 ]; then
    docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1
  else
    docker exec "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"
  fi
}

expect_failure() {
  local expected_message="$1"
  local sql="$2"
  local output status
  set +e
  output="$(run_psql -c "$sql" 2>&1)"
  status=$?
  set -e
  if [ "$status" -eq 0 ] || [[ "$output" != *"$expected_message"* ]]; then
    echo "expected failure containing: $expected_message" >&2
    echo "$output" >&2
    exit 1
  fi
}

run_as_authenticated() {
  local user_id="$1"
  local sql="$2"
  run_psql -qAtc "SET ROLE authenticated; SET request.jwt.claim.sub = '$user_id'; $sql"
}

echo "Starting disposable $IMAGE database: $NAME"
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null

bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"

docker cp "$MIGRATION" "$NAME":/tmp/p0-bridge-membership.sql

run_psql <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

CREATE TABLE public.user_empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  is_default boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legacy_membership_key UNIQUE (user_id, empresa_id)
);
CREATE TABLE public.user_roles (user_id uuid PRIMARY KEY, is_admin boolean NOT NULL DEFAULT false);
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE((SELECT is_admin FROM public.user_roles WHERE user_id = _user_id), false) $$;
ALTER TABLE public.user_empresas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_empresas FROM PUBLIC, authenticated, anon;

INSERT INTO public.user_empresas (id, user_id, empresa_id, is_default) VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', true),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000012', false),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000021', true);
INSERT INTO public.user_roles (user_id, is_admin) VALUES ('00000000-0000-0000-0000-000000000099', true);
SQL

# The fixture uses a legacy constraint name. Equivalence must be by columns.
for pass in 1 2; do
  run_psql -f /tmp/p0-bridge-membership.sql >/dev/null
  echo "migration pass $pass succeeded"
done

one_default_index="$(run_psql -Atc "SELECT count(*) FROM pg_index WHERE indrelid='public.user_empresas'::regclass AND indisunique AND pg_get_expr(indpred,indrelid)='(is_default IS TRUE)'")"
[ "$one_default_index" = '1' ] || { echo 'partial unique default index is missing' >&2; exit 1; }

for signature in 'public.get_my_user_empresas()' 'public.set_own_default_empresa(uuid)' 'public.admin_associar_usuario_empresa(uuid, uuid, boolean)'; do
  authenticated="$(run_psql -Atc "SELECT has_function_privilege('authenticated', '$signature', 'EXECUTE')")"
  anon="$(run_psql -Atc "SELECT has_function_privilege('anon', '$signature', 'EXECUTE')")"
  [ "$authenticated" = "t" ] && [ "$anon" = "f" ] || { echo "unexpected ACL for $signature" >&2; exit 1; }
done

USER_A='00000000-0000-0000-0000-000000000001'
USER_B='00000000-0000-0000-0000-000000000002'
ADMIN='00000000-0000-0000-0000-000000000099'
EMP_A1='00000000-0000-0000-0000-000000000011'
EMP_A2='00000000-0000-0000-0000-000000000012'
EMP_B1='00000000-0000-0000-0000-000000000021'
EMP_B2='00000000-0000-0000-0000-000000000022'

own_rows="$(run_as_authenticated "$USER_A" "SELECT string_agg(empresa_id::text, ',' ORDER BY empresa_id) FROM public.get_my_user_empresas();")"
[ "$own_rows" = "$EMP_A1,$EMP_A2" ] || { echo "self membership read leaked or omitted rows: $own_rows" >&2; exit 1; }

run_as_authenticated "$USER_A" "SELECT public.set_own_default_empresa('$EMP_A2');" >/dev/null
default_after_own="$(run_psql -Atc "SELECT empresa_id FROM public.user_empresas WHERE user_id = '$USER_A' AND is_default")"
[ "$default_after_own" = "$EMP_A2" ] || { echo "own default was not selected atomically" >&2; exit 1; }

expect_failure 'Empresa não vinculada ao usuário autenticado' "SET ROLE authenticated; SET request.jwt.claim.sub = '$USER_A'; SELECT public.set_own_default_empresa('$EMP_B1');"
default_after_cross_tenant="$(run_psql -Atc "SELECT empresa_id FROM public.user_empresas WHERE user_id = '$USER_A' AND is_default")"
[ "$default_after_cross_tenant" = "$EMP_A2" ] || { echo "cross-tenant attempt changed default" >&2; exit 1; }

expect_failure 'permission denied for table user_empresas' "SET ROLE authenticated; SET request.jwt.claim.sub = '$USER_A'; UPDATE public.user_empresas SET is_default = false WHERE user_id = '$USER_A';"
expect_failure 'Apenas administradores podem associar usuários a empresas' "SET ROLE authenticated; SET request.jwt.claim.sub = '$USER_A'; SELECT * FROM public.admin_associar_usuario_empresa('$USER_B', '$EMP_B2', true);"

run_as_authenticated "$ADMIN" "SELECT * FROM public.admin_associar_usuario_empresa('$USER_B', '$EMP_B2', true);" >/dev/null
admin_default="$(run_psql -Atc "SELECT empresa_id FROM public.user_empresas WHERE user_id = '$USER_B' AND is_default")"
[ "$admin_default" = "$EMP_B2" ] || { echo "admin association did not atomically set target default" >&2; exit 1; }

# Twenty competing tabs must still leave one and only one default.
pids=()
for i in $(seq 1 20); do
  target="$EMP_A1"
  [ $((i % 2)) -eq 0 ] && target="$EMP_A2"
  (run_as_authenticated "$USER_A" "SELECT public.set_own_default_empresa('$target');" >/dev/null) >"$RESULT_DIR/$i" 2>&1 &
  pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid" || { echo "concurrent default-company process failed" >&2; exit 1; }; done
if find "$RESULT_DIR" -type f -size +0c | grep -q .; then
  echo "concurrent own-default call failed" >&2
  find "$RESULT_DIR" -type f -size +0c -exec cat {} + >&2
  exit 1
fi
default_count="$(run_psql -Atc "SELECT count(*) FROM public.user_empresas WHERE user_id = '$USER_A' AND is_default")"
[ "$default_count" = '1' ] || { echo "concurrency left $default_count defaults" >&2; exit 1; }

expect_failure 'duplicate key value violates unique constraint' "INSERT INTO public.user_empresas(user_id,empresa_id,is_default) VALUES ('$USER_A','$EMP_B2',true);"

run_psql -c 'CREATE DATABASE p0_membership_missing_prerequisite' >/dev/null
set +e
missing_output="$(docker exec "$NAME" psql -X -U postgres -d p0_membership_missing_prerequisite -v ON_ERROR_STOP=1 -f /tmp/p0-bridge-membership.sql 2>&1)"
missing_status=$?
set -e
if [ "$missing_status" -eq 0 ] || [[ "$missing_output" != *'requires public.user_empresas'* ]]; then
  echo "missing table did not fail closed" >&2
  exit 1
fi

run_psql -c 'CREATE DATABASE p0_membership_missing_unique' >/dev/null
docker exec -i "$NAME" psql -X -U postgres -d p0_membership_missing_unique -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE public.user_empresas (
  id uuid PRIMARY KEY, user_id uuid NOT NULL, empresa_id uuid NOT NULL,
  is_default boolean, created_at timestamptz NOT NULL DEFAULT now()
);
SQL
set +e
unique_output="$(docker exec "$NAME" psql -X -U postgres -d p0_membership_missing_unique -v ON_ERROR_STOP=1 -f /tmp/p0-bridge-membership.sql 2>&1)"
unique_status=$?
set -e
if [ "$unique_status" -eq 0 ] || [[ "$unique_output" != *'requires UNIQUE(user_id, empresa_id)'* ]]; then
  echo "missing unique constraint did not fail closed" >&2
  exit 1
fi

echo 'P0_BRIDGE_MEMBERSHIP_MIGRATION_OK: ACL, own-row isolation, cross-tenant denial, admin-only association, concurrency and fail-closed prerequisites validated.'
