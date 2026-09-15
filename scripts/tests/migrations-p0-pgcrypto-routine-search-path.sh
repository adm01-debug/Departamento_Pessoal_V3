#!/usr/bin/env bash
# Reproduces an unqualified pgcrypto call and validates the P0 function-local
# search_path fix in disposable PostgreSQL 17.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260912152000_p0_pgcrypto_routine_search_path.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p0-pgcrypto-path-$$"
command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
test -f "$MIGRATION" || { echo "migration not found: $MIGRATION" >&2; exit 1; }
cleanup() { [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
psql_run() { docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"
docker cp "$MIGRATION" "$NAME":/tmp/p0-pgcrypto-path.sql

psql_run <<'SQL'
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
-- The historical function was accepted before the extension moved out of
-- public; defer SQL-body resolution so the fixture reproduces that state.
SET check_function_bodies = false;
CREATE FUNCTION public.assinar_desligamento(uuid,text) RETURNS text LANGUAGE sql AS $$ SELECT encode(digest($2, 'sha256'), 'hex') $$;
RESET check_function_bodies;
CREATE FUNCTION public.assinar_espelho_ponto(uuid,text,inet,text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
CREATE FUNCTION public.contrato_assinar_por_token(text,text,text,inet,text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
CREATE FUNCTION public.contrato_consultar_por_token(text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
CREATE FUNCTION public.contrato_gerar_token_assinatura(uuid,text,text,integer) RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
CREATE FUNCTION public.contrato_preview_url_por_token(text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
CREATE FUNCTION public.gerar_hash_batida_ponto() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE FUNCTION public.gerar_relatorio_conformidade_ponto() RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
CREATE FUNCTION public.medida_gerar_link_ciencia(uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
CREATE FUNCTION public.medida_registrar_ciencia_publica(text,text,text,text,text,jsonb) RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
CREATE FUNCTION public.processar_ajuste_aprovado(uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
CREATE FUNCTION public.sst_regimento_assinar(uuid,uuid,text,text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
CREATE FUNCTION public.sst_regimento_publicar(uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
CREATE FUNCTION public.verificar_espelho_ponto(uuid) RETURNS void LANGUAGE plpgsql AS $$ BEGIN END $$;
SQL

set +e
before="$(psql_run -Atc "SELECT public.assinar_desligamento('00000000-0000-0000-0000-000000000001', 'fixture')" 2>&1)"
before_status=$?
set -e
if [ "$before_status" -eq 0 ] || [[ "$before" != *'function digest'* ]]; then
  echo "fixture did not reproduce missing pgcrypto search_path" >&2
  exit 1
fi

for pass in 1 2; do psql_run -f /tmp/p0-pgcrypto-path.sql >/dev/null; echo "migration pass $pass succeeded"; done
after="$(psql_run -Atc "SELECT public.assinar_desligamento('00000000-0000-0000-0000-000000000001', 'fixture')")"
[ "${#after}" = "64" ] || { echo "pgcrypto digest was not resolved after remediation" >&2; exit 1; }
remaining="$(psql_run -Atc "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname = ANY (ARRAY['assinar_desligamento','assinar_espelho_ponto','contrato_assinar_por_token','contrato_consultar_por_token','contrato_gerar_token_assinatura','contrato_preview_url_por_token','gerar_hash_batida_ponto','gerar_relatorio_conformidade_ponto','medida_gerar_link_ciencia','medida_registrar_ciencia_publica','processar_ajuste_aprovado','sst_regimento_assinar','sst_regimento_publicar','verificar_espelho_ponto']) AND NOT ('search_path=pg_catalog, public, extensions'=ANY(p.proconfig))")"
[ "$remaining" = "0" ] || { echo "pgcrypto caller still lacks fixed path" >&2; exit 1; }
echo 'P0_PGCRYPTO_ROUTINE_SEARCH_PATH_OK: reproduced runtime failure and validated 14 allowlisted routines idempotently.'
