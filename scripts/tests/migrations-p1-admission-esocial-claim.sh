#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20260912204000_p1_admission_esocial_claim.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine}"
NAME="dp-p1-admission-esocial-$$"
RESULT_DIR="$(mktemp -d)"

cleanup() {
  [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true
  rm -rf "$RESULT_DIR"
}
trap cleanup EXIT
run_psql() { docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }
expect_failure() {
  local sql="$1" expected="$2" output status
  set +e; output="$(run_psql -c "$sql" 2>&1)"; status=$?; set -e
  [ "$status" -ne 0 ] && [[ "$output" == *"$expected"* ]] || {
    echo "expected failure containing: $expected" >&2; echo "$output" >&2; exit 1;
  }
}

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"
docker cp "$MIGRATION" "$NAME":/tmp/migration.sql

run_psql <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TYPE public.app_role AS ENUM ('admin','rh','user');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE TABLE public.user_empresas(user_id uuid, empresa_id uuid);
CREATE TABLE public.user_roles(user_id uuid, role text);
CREATE FUNCTION public.pode_gerir_rh(_empresa_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_empresas ue JOIN public.user_roles ur USING(user_id)
    WHERE ue.user_id=auth.uid() AND ue.empresa_id=_empresa_id AND ur.role IN ('admin','rh')
  )
$$;
CREATE FUNCTION public.user_belongs_to_empresa(_user_id uuid,_empresa_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT EXISTS (SELECT 1 FROM public.user_empresas WHERE user_id=_user_id AND empresa_id=_empresa_id) $$;
CREATE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role::text) $$;
CREATE TABLE public.admissoes(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid, nome text NOT NULL,
  cpf text, data_prevista date, data_nascimento date, etapa text DEFAULT 'solicitacao',
  checklist_esocial_enviado boolean DEFAULT false, status_esocial text DEFAULT 'pendente',
  protocolo_esocial text, data_transmissao_esocial timestamptz,
  metadata jsonb DEFAULT '{}', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.esocial_eventos(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid, tipo_evento text NOT NULL,
  competencia text, status text DEFAULT 'rascunho', dados jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.audit_log_unified(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_table text, empresa_id uuid,
  user_id uuid, action text, entity text, entity_id text, payload jsonb,
  occurred_at timestamptz DEFAULT now()
);
CREATE TABLE public.contratos_gerados(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid NOT NULL,
  admissao_id uuid, colaborador_id uuid,
  sha256 text, status text DEFAULT 'enviado', assinado_em timestamptz,
  assinatura_metadata jsonb, updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.colaboradores(id uuid PRIMARY KEY, empresa_id uuid, cpf text);
CREATE TABLE public.contrato_assinatura_tokens(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contrato_id uuid NOT NULL,
  empresa_id uuid NOT NULL, token_hash text NOT NULL, cpf_esperado text,
  expira_em timestamptz NOT NULL, usado_em timestamptz, assinado_ip inet,
  assinado_ua text, assinatura_hash text, tentativas integer DEFAULT 0,
  revogado_em timestamptz, email_destinatario text, created_by uuid
);
CREATE FUNCTION public.contrato_assinar_por_token(text,text,text,inet,text,text,text)
RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"unsafe":true}'::jsonb $$;

INSERT INTO public.user_empresas VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','10000000-0000-0000-0000-000000000001'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2','10000000-0000-0000-0000-000000000001');
INSERT INTO public.user_roles VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1','rh'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2','user');
INSERT INTO public.admissoes(id,empresa_id,nome,cpf,data_prevista,data_nascimento) VALUES
  ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Histórica','52998224725','2026-10-01','1990-01-01'),
  ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Concorrente','52998224725','2026-10-02','1991-01-01');
INSERT INTO public.esocial_eventos(id,empresa_id,tipo_evento,dados,created_at) VALUES
  ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','S-2200','{"admissaoId":"20000000-0000-0000-0000-000000000001"}',now()-interval '1 minute'),
  ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','S-2200','{"admissaoId":"20000000-0000-0000-0000-000000000001"}',now());
SQL

for pass in 1 2; do run_psql -f /tmp/migration.sql >/dev/null; echo "admission eSocial migration pass $pass succeeded"; done

attached="$(run_psql -qAtc "SELECT count(*) FROM public.esocial_eventos WHERE admissao_id='20000000-0000-0000-0000-000000000001';")"
[ "$attached" = "1" ] || { echo "historical duplicate reconciliation failed: $attached" >&2; exit 1; }

pids=()
for i in 1 2 3 4; do
  (set +e; docker exec "$NAME" psql -X -qAt -U postgres -v ON_ERROR_STOP=1 -c \
    "SET ROLE authenticated; SET request.jwt.claim.sub='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'; SELECT (r->>'evento_id')||':'||(r->>'claim_token') FROM (SELECT public.claim_admission_esocial_event('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001') r) q;" \
    >"$RESULT_DIR/$i.out" 2>"$RESULT_DIR/$i.err"; echo "$?" >"$RESULT_DIR/$i.status") &
  pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done

successes="$(grep -l '^0$' "$RESULT_DIR"/*.status | wc -l | tr -d ' ')"
event_count="$(run_psql -qAtc "SELECT count(*) FROM public.esocial_eventos WHERE admissao_id='20000000-0000-0000-0000-000000000002';")"
[ "$successes:$event_count" = "1:1" ] || { echo "exclusive S-2200 claim failed: $successes/$event_count" >&2; exit 1; }
grep -q 'transmission already in progress' "$RESULT_DIR"/*.err || { echo "concurrent callers were not rejected" >&2; exit 1; }
claim_pair="$(cat "$(grep -l '^0$' "$RESULT_DIR"/*.status | sed 's/\.status$/.out/' | head -1)")"
event_id="${claim_pair%%:*}"
claim_token="${claim_pair#*:}"

expect_failure "SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',false); SELECT public.claim_admission_esocial_event('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001');" 'not authorized'
expect_failure "SET ROLE anon; SELECT public.claim_admission_esocial_event('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001');" 'permission denied'
expect_failure "SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',false); SELECT public.complete_admission_esocial_event('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','$event_id','$claim_token','','');" 'invalid admission eSocial completion'

# The transport persists its receipt before the application completes the
# admission. A lost completion response must be safe to replay afterwards.
run_psql -qAtc "UPDATE public.esocial_eventos SET status='enviado' WHERE id='$event_id';" >/dev/null
run_psql -qAtc "SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',false); SELECT public.complete_admission_esocial_event('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','$event_id','$claim_token','PROTO-1','REC-1');" >/dev/null
run_psql -qAtc "SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',false); SELECT public.complete_admission_esocial_event('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','$event_id','$claim_token','PROTO-1','REC-1');" >/dev/null
completed="$(run_psql -qAtc "SELECT status_esocial||':'||checklist_esocial_enviado||':'||protocolo_esocial FROM public.admissoes WHERE id='20000000-0000-0000-0000-000000000002';")"
[ "$completed" = "enviado:true:PROTO-1" ] || { echo "atomic completion failed: $completed" >&2; exit 1; }
already_sent="$(run_psql -qAtc "SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',false); SELECT public.claim_admission_esocial_event('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001')->>'state';" | tail -1)"
[ "$already_sent" = 'already_sent' ] || { echo "completed transmission was not replay-safe: $already_sent" >&2; exit 1; }
recovery="$(run_psql -qAtc "SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',false); SELECT public.fail_admission_esocial_event('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','$event_id','$claim_token')->>'state';" | tail -1)"
[ "$recovery" = 'already_sent' ] || { echo "concurrent completion recovery state missing: $recovery" >&2; exit 1; }
[ "$(run_psql -qAtc "SELECT status_esocial FROM public.admissoes WHERE id='20000000-0000-0000-0000-000000000002';")" = "enviado" ] || {
  echo "failure recovery regressed a completed admission" >&2; exit 1;
}
[ "$(run_psql -qAtc "SELECT count(*) FROM public.audit_log_unified WHERE entity_id='20000000-0000-0000-0000-000000000002' AND action='ESOCIAL_ADMISSION_COMPLETE';")" = "1" ] || {
  echo "atomic completion audit missing" >&2; exit 1;
}

# Token generation derives the immutable expected CPF from the contract target;
# callers can no longer create an unusable/identity-free public token.
run_psql -qAtc "INSERT INTO public.contratos_gerados(id,empresa_id,admissao_id,sha256,status) VALUES ('40000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','document-hash-3','gerado');" >/dev/null
generated_token="$(run_psql -qAtc "SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',false); SELECT token FROM public.contrato_gerar_token_assinatura('40000000-0000-0000-0000-000000000003',NULL,NULL,7);" | tail -1)"
[ "${#generated_token}" = 32 ] || { echo 'secure contract token was not generated' >&2; exit 1; }
[ "$(run_psql -qAtc "SELECT cpf_esperado FROM public.contrato_assinatura_tokens WHERE contrato_id='40000000-0000-0000-0000-000000000003'")" = '52998224725' ] || {
  echo 'token generator did not derive expected signer CPF' >&2; exit 1;
}

# Public contract signing: missing/wrong CPF must never pass SQL NULL
# comparison, and the historical unsafe seven-argument overload is removed.
[ "$(run_psql -qAtc "SELECT to_regprocedure('public.contrato_assinar_por_token(text,text,text,inet,text,text,text)') IS NULL;")" = "t" ] || {
  echo "unsafe contract-signature overload survived" >&2; exit 1;
}
token='public-contract-token-0001'
run_psql -qAtc "INSERT INTO public.contratos_gerados(id,empresa_id,sha256) VALUES ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','document-hash'); INSERT INTO public.contrato_assinatura_tokens(id,contrato_id,empresa_id,token_hash,cpf_esperado,expira_em) VALUES ('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',encode(sha256(convert_to('$token','UTF8')),'hex'),'529.982.247-25',now()+interval '1 day');" >/dev/null
expect_failure "SET ROLE anon; SELECT public.contrato_assinar_por_token('$token',NULL,'Nome Completo',NULL,NULL);" 'CPF inválido'
wrong_signer="$(run_psql -qAtc "SET ROLE anon; SELECT public.contrato_assinar_por_token('$token','11111111111','Nome Completo',NULL,NULL)->>'error_code';")"
[ "$wrong_signer" = "INVALID_SIGNER" ] || { echo "wrong CPF did not return controlled failure: $wrong_signer" >&2; exit 1; }
attempts="$(run_psql -qAtc "SELECT tentativas FROM public.contrato_assinatura_tokens WHERE token_hash=encode(sha256(convert_to('$token','UTF8')),'hex');")"
[ "$attempts" = "1" ] || { echo "wrong CPF attempt was rolled back: $attempts" >&2; exit 1; }
signed="$(run_psql -qAtc "SET ROLE anon; SELECT public.contrato_assinar_por_token('$token','52998224725','Nome Completo',NULL,'test-agent')->>'success';")"
[ "$signed" = "true" ] || { echo "valid public signature failed: $signed" >&2; exit 1; }
[ "$(run_psql -qAtc "SELECT status||':'||(assinatura_metadata->>'cpf') FROM public.contratos_gerados WHERE id='40000000-0000-0000-0000-000000000001';")" = "assinado:52998224725" ] || {
  echo "contract signature was not persisted" >&2; exit 1;
}

null_cpf_token='public-contract-token-null-cpf'
run_psql -qAtc "INSERT INTO public.contratos_gerados(id,empresa_id,sha256) VALUES ('40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','document-hash-2'); INSERT INTO public.contrato_assinatura_tokens(id,contrato_id,empresa_id,token_hash,cpf_esperado,expira_em) VALUES ('50000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001',encode(sha256(convert_to('$null_cpf_token','UTF8')),'hex'),NULL,now()+interval '1 day');" >/dev/null
null_cpf_result="$(run_psql -qAtc "SET ROLE anon; SELECT public.contrato_assinar_por_token('$null_cpf_token','52998224725','Nome Completo',NULL,NULL)->>'error_code';")"
[ "$null_cpf_result" = 'INVALID_SIGNER' ] || { echo "token without expected CPF was accepted: $null_cpf_result" >&2; exit 1; }

run_psql -c 'CREATE DATABASE missing_admission_esocial' >/dev/null
set +e
missing="$(docker exec -i "$NAME" psql -X -U postgres -d missing_admission_esocial -v ON_ERROR_STOP=1 -f /tmp/migration.sql 2>&1)"; status=$?
set -e
[ "$status" -ne 0 ] && [[ "$missing" == *'requires public.admissoes'* ]] || { echo "preflight did not fail closed" >&2; exit 1; }

echo 'P1_ADMISSION_ESOCIAL_CLAIM_OK: backfill, exclusive lease, 4-way concurrency, RBAC, completion, recovery, signer identity and audit passed.'
