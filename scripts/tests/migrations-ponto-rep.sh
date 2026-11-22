#!/usr/bin/env bash
# Prova a migration de entrada do relógio de ponto (ponto_rep_*): aplica duas
# vezes, o sidecar devolve `ok`, RH/admin só lê a própria empresa, usuário
# comum não lê nada, o navegador não enxerga token_hash nem escreve, e
# token_hash fora do formato SHA-256 hex é recusado.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20261121210000_ponto_rep_ingestao.sql"
VERIFY="$REPO_ROOT/supabase/migrations/20261121210000_ponto_rep_ingestao.verify.sql"
# Etapa 53: staging de feriados e jornadas do AtecSoft.
FERIADOS="$REPO_ROOT/supabase/migrations/20261123150000_ponto_rep_feriados_horarios.sql"
FERIADOS_VERIFY="$REPO_ROOT/supabase/migrations/20261123150000_ponto_rep_feriados_horarios.verify.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24}"
NAME="dp-ponto-rep-$$"

RH_A='00000000-0000-0000-0000-0000000000a1'
ADMIN_A='00000000-0000-0000-0000-0000000000a2'
COMUM_A='00000000-0000-0000-0000-0000000000a3'

cleanup() { [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f -v "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
run_psql() { docker exec "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }
# Consulta como usuário do navegador (papel + JWT com sub).
as_user() {
  local role="$1" sub="$2" sql="$3"
  run_psql -qAt -c "SET ROLE $role; SELECT set_config('request.jwt.claims', '{\"sub\":\"$sub\"}', false); $sql" | tail -n 1
}
expect_eq() {
  [ "$2" = "$3" ] || { echo "$1: esperado '$3', veio '$2'" >&2; exit 1; }
}
expect_denied() {
  local output status expected="$2"
  set +e
  output="$(run_psql -c "$1" 2>&1)"; status=$?
  set -e
  [ "$status" -ne 0 ] && [[ "$output" == *"$expected"* ]] || {
    echo "esperava negação contendo: $expected" >&2; echo "$output" >&2; exit 1;
  }
}

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"
docker cp "$MIGRATION" "$NAME":/tmp/ponto-rep.sql
docker cp "$VERIFY" "$NAME":/tmp/ponto-rep.verify.sql
docker cp "$FERIADOS" "$NAME":/tmp/ponto-rep-feriados.sql
docker cp "$FERIADOS_VERIFY" "$NAME":/tmp/ponto-rep-feriados.verify.sql

# Stubs mínimos do Supabase e das funções de autorização usadas pelas policies.
docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT (COALESCE(NULLIF(current_setting('request.jwt.claims',true),''),'{}')::jsonb->>'sub')::uuid $$;

CREATE TYPE public.app_role AS ENUM ('admin','gestor','rh','user','supervisor','coordenador');
CREATE TABLE public.empresas(id uuid PRIMARY KEY, nome text NOT NULL);
CREATE TABLE public.colaboradores(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid REFERENCES public.empresas(id));
CREATE TABLE public.user_empresas(user_id uuid, empresa_id uuid, PRIMARY KEY(user_id, empresa_id));
CREATE TABLE public.user_roles(user_id uuid, role public.app_role, PRIMARY KEY(user_id, role));
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE OR REPLACE FUNCTION public.pertence_a_empresa(_empresa_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT EXISTS(SELECT 1 FROM public.user_empresas WHERE user_id = auth.uid() AND empresa_id = _empresa_id) $$;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

INSERT INTO public.empresas VALUES
  ('10000000-0000-0000-0000-00000000000a', 'Empresa A'),
  ('10000000-0000-0000-0000-00000000000b', 'Empresa B');
INSERT INTO public.user_empresas VALUES
  ('00000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a');
INSERT INTO public.user_roles VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'rh'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin'),
  ('00000000-0000-0000-0000-0000000000a3', 'user');
SQL

for pass in 1 2; do
  run_psql -q -f /tmp/ponto-rep.sql
  run_psql -q -f /tmp/ponto-rep-feriados.sql
  verify="$(run_psql -qAt -f /tmp/ponto-rep.verify.sql)"
  verify_feriados="$(run_psql -qAt -f /tmp/ponto-rep-feriados.verify.sql)"
  expect_eq "sidecar de feriados na passada $pass" "$verify_feriados" "ok"
  expect_eq "sidecar após passada $pass" "$verify" "ok"
  echo "ponto_rep migration pass $pass succeeded (sidecar: $verify)"
done

# Uma linha de cada tabela nas empresas A e B, gravada como o backend grava.
docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 -q <<'SQL'
SET ROLE service_role;
INSERT INTO public.ponto_rep_dispositivos(id, empresa_id, nome, unidade, token_hash, token_prefixo) VALUES
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Henry A', 'Matriz', repeat('a', 64), 'dpa_'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'Henry B', 'Filial', repeat('b', 64), 'dpb_');
INSERT INTO public.ponto_rep_lotes(dispositivo_id, empresa_id) VALUES
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b');
INSERT INTO public.ponto_rep_funcionarios(dispositivo_id, empresa_id, codigo, nome) VALUES
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 1, 'Func A'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 1, 'Func B');
INSERT INTO public.ponto_rep_dias(dispositivo_id, empresa_id, funcionario_codigo, data, hash_conteudo) VALUES
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 1, '2026-11-20', 'h-a'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 1, '2026-11-20', 'h-b');
INSERT INTO public.ponto_rep_justificativas(dispositivo_id, empresa_id, codigo, nome) VALUES
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 1, 'Atestado A'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 1, 'Atestado B');
INSERT INTO public.ponto_rep_feriados(dispositivo_id, empresa_id, codigo, nome, data) VALUES
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 3, 'Natal A', '2026-12-25'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 3, 'Natal B', '2026-12-25');
INSERT INTO public.ponto_rep_horarios(dispositivo_id, empresa_id, codigo, dia_semana) VALUES
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 1, 2),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 1, 2);
SQL

EMP_A='10000000-0000-0000-0000-00000000000a'
for tabela in ponto_rep_dispositivos ponto_rep_lotes ponto_rep_funcionarios ponto_rep_dias \
  ponto_rep_justificativas ponto_rep_feriados ponto_rep_horarios; do
  # count(empresa_id): em dispositivos o GRANT é por coluna (sem token_hash).
  sql="SELECT count(empresa_id) || '/' || count(*) FILTER (WHERE empresa_id = '$EMP_A') FROM public.$tabela;"
  expect_eq "RH da empresa A em $tabela" "$(as_user authenticated "$RH_A" "$sql")" "1/1"
  expect_eq "admin da empresa A em $tabela" "$(as_user authenticated "$ADMIN_A" "$sql")" "1/1"
  expect_eq "usuário comum em $tabela" "$(as_user authenticated "$COMUM_A" "$sql")" "0/0"
  expect_denied "SET ROLE anon; SELECT count(empresa_id) FROM public.$tabela;" "permission denied"
  expect_denied "SET ROLE authenticated; DELETE FROM public.$tabela;" "permission denied"
  expect_denied "SET ROLE authenticated; UPDATE public.$tabela SET empresa_id = empresa_id;" "permission denied"
  expect_denied "SET ROLE anon; UPDATE public.$tabela SET empresa_id = empresa_id;" "permission denied"
done
echo "leitura por empresa e bloqueio de escrita conferidos nas 7 tabelas"

expect_denied "SET ROLE authenticated; SELECT set_config('request.jwt.claims','{\"sub\":\"$RH_A\"}',false); SELECT token_hash FROM public.ponto_rep_dispositivos;" "permission denied"
expect_denied "SET ROLE authenticated; INSERT INTO public.ponto_rep_dispositivos(empresa_id, nome, unidade, token_hash, token_prefixo) VALUES ('$EMP_A','x','y',repeat('c',64),'x');" "permission denied"
expect_denied "SET ROLE anon; INSERT INTO public.ponto_rep_lotes(dispositivo_id, empresa_id) VALUES ('20000000-0000-0000-0000-00000000000a','$EMP_A');" "permission denied"
echo "authenticated não lê token_hash; authenticated e anon não inserem"

for ruim in 'abc' "$(printf 'A%.0s' $(seq 64))" "$(printf 'a%.0s' $(seq 63))g"; do
  expect_denied "SET ROLE service_role; INSERT INTO public.ponto_rep_dispositivos(empresa_id, nome, unidade, token_hash, token_prefixo) VALUES ('$EMP_A','x','u-$RANDOM','$ruim','x');" "ponto_rep_dispositivos_token_hash_fmt"
done
echo "token_hash fora do formato SHA-256 hex minúsculo recusado"

for ruim in 0 8; do
  expect_denied "SET ROLE service_role; INSERT INTO public.ponto_rep_horarios(dispositivo_id, empresa_id, codigo, dia_semana) VALUES ('20000000-0000-0000-0000-00000000000a','$EMP_A',2,$ruim);" "ponto_rep_horarios_dia_semana_check"
done
echo "dia_semana fora de 1..7 recusado"

# O sidecar precisa enxergar a chave unica ausente: CREATE TABLE IF NOT EXISTS nao
# recria nada, e uma tabela preexistente sem a constraint faria o upsert da Edge
# falhar em producao (42P10). Prova que o check nao e decorativo.
run_psql -q -c 'ALTER TABLE public.ponto_rep_feriados DROP CONSTRAINT ponto_rep_feriados_dispositivo_codigo_key;'
run_psql -q -c 'ALTER TABLE public.ponto_rep_horarios DROP CONSTRAINT ponto_rep_horarios_dispositivo_codigo_dia_key;'
falha="$(run_psql -qAt -f /tmp/ponto-rep-feriados.verify.sql)"
case "$falha" in
  'FALHOU: ponto_rep_feriados sem unique'*) ;;
  *) echo "sidecar nao viu a unique de feriados ausente: $falha" >&2; exit 1;;
esac
run_psql -q -c 'ALTER TABLE public.ponto_rep_feriados ADD CONSTRAINT ponto_rep_feriados_dispositivo_codigo_key UNIQUE (dispositivo_id, codigo);'
falha="$(run_psql -qAt -f /tmp/ponto-rep-feriados.verify.sql)"
case "$falha" in
  'FALHOU: ponto_rep_horarios sem unique'*) ;;
  *) echo "sidecar nao viu a unique de horarios ausente: $falha" >&2; exit 1;;
esac
echo "sidecar reprova tabela existente sem as chaves unicas do upsert"

# Nome certo nao basta: a constraint tem de cobrir as colunas do ON CONFLICT.
# Recriar com o mesmo nome sobre outras colunas deixaria o upsert da Edge
# quebrado (42P10) e o sidecar passaria feliz.
run_psql -q -c 'ALTER TABLE public.ponto_rep_horarios ADD CONSTRAINT ponto_rep_horarios_dispositivo_codigo_dia_key UNIQUE (dispositivo_id, codigo);'
falha="$(run_psql -qAt -f /tmp/ponto-rep-feriados.verify.sql)"
case "$falha" in
  'FALHOU: ponto_rep_horarios sem unique'*) ;;
  *) echo "sidecar aceitou unique de horarios sem dia_semana: $falha" >&2; exit 1;;
esac
# Constraint DEFERRABLE nao serve para ON CONFLICT (nao e verificada no momento
# do insert): o sidecar tem de reprovar tambem.
run_psql -q -c 'ALTER TABLE public.ponto_rep_horarios DROP CONSTRAINT ponto_rep_horarios_dispositivo_codigo_dia_key;'
run_psql -q -c 'ALTER TABLE public.ponto_rep_horarios ADD CONSTRAINT ponto_rep_horarios_dispositivo_codigo_dia_key UNIQUE (dispositivo_id, codigo, dia_semana) DEFERRABLE;'
falha="$(run_psql -qAt -f /tmp/ponto-rep-feriados.verify.sql)"
case "$falha" in
  'FALHOU: ponto_rep_horarios sem unique'*) ;;
  *) echo "sidecar aceitou unique de horarios DEFERRABLE: $falha" >&2; exit 1;;
esac
run_psql -q -c 'ALTER TABLE public.ponto_rep_horarios DROP CONSTRAINT ponto_rep_horarios_dispositivo_codigo_dia_key;'
run_psql -q -c 'ALTER TABLE public.ponto_rep_horarios ADD CONSTRAINT ponto_rep_horarios_dispositivo_codigo_dia_key UNIQUE (dispositivo_id, codigo, dia_semana);'
falha="$(run_psql -qAt -f /tmp/ponto-rep-feriados.verify.sql)"
[ "$falha" = 'ok' ] || { echo "sidecar nao voltou a ok com a unique correta: $falha" >&2; exit 1; }
echo "sidecar confere as colunas e o carater nao-deferrable das chaves unicas"

echo 'PONTO_REP_OK: migration reaplicável, sidecar ok, RLS por empresa, token_hash oculto, escrita só do backend.'
