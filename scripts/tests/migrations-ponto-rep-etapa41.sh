#!/usr/bin/env bash
# Prova a conversao do dia do relogio em batida (etapa 41 do plano do Ponto
# AtecSoft): dia sem vinculo nao vira batida, dia normal vira 4 batidas de
# origem 'relogio' com ordem fixa por posicao, reprocessar nao duplica, batida
# de outra origem sobrevive, competencia fechada nao converte e a correcao vinda
# do AtecSoft entra por UPDATE com trilha em ponto_auditoria.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20261123090000_ponto_rep_converter_batidas.sql"
VERIFY="$REPO_ROOT/supabase/migrations/20261123090000_ponto_rep_converter_batidas.verify.sql"
PROTECAO="$REPO_ROOT/supabase/migrations/20261121222000_batidas_relogio_protecao.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24}"
NAME="dp-ponto-relogio-$$"

RH_A='00000000-0000-0000-0000-0000000000b1'
COMUM_A='00000000-0000-0000-0000-0000000000b2'
EMP_A='10000000-0000-0000-0000-00000000000a'
EMP_B='10000000-0000-0000-0000-00000000000b'
COLAB_A='30000000-0000-0000-0000-00000000000a'
COLAB_SEM_VINCULO='30000000-0000-0000-0000-0000000000ff'
DISP_A='20000000-0000-0000-0000-00000000000a'
DIA_A='40000000-0000-0000-0000-00000000000a'

cleanup() { [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f -v "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
run_psql() { docker exec "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"; }
sql_val() { run_psql -qAt -c "$1" | tail -n 1; }
as_user() {
  local role="$1" sub="$2" sql="$3"
  run_psql -qAt -c "SET ROLE $role; SELECT set_config('request.jwt.claims', '{\"sub\":\"$sub\"}', false); $sql" | tail -n 1
}
expect_eq() {
  [ "$2" = "$3" ] || { echo "$1: esperado '$3', veio '$2'" >&2; exit 1; }
}
expect_denied() {
  local output status
  set +e
  output="$(run_psql -c "$1" 2>&1)"; status=$?
  set -e
  [ "$status" -ne 0 ] && [[ "$output" == *"$2"* ]] || {
    echo "esperava negacao contendo: $2" >&2; echo "$output" >&2; exit 1;
  }
}

docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null
bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"
docker cp "$MIGRATION" "$NAME":/tmp/converter.sql
docker cp "$VERIFY" "$NAME":/tmp/converter.verify.sql
docker cp "$PROTECAO" "$NAME":/tmp/protecao.sql

# Stubs minimos do Supabase e o schema que a conversao toca (mesmas colunas e
# restricoes do canonico, reduzidas ao que o teste exercita).
docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT (COALESCE(NULLIF(current_setting('request.jwt.claims',true),''),'{}')::jsonb->>'sub')::uuid $$;

CREATE TYPE public.app_role AS ENUM ('admin','gestor','rh','user','supervisor','coordenador');
CREATE TABLE public.empresas(id uuid PRIMARY KEY, nome text NOT NULL);
CREATE TABLE public.colaboradores(
  id uuid PRIMARY KEY,
  empresa_id uuid REFERENCES public.empresas(id),
  user_id uuid,
  nome text
);
CREATE TABLE public.user_empresas(user_id uuid, empresa_id uuid, PRIMARY KEY(user_id, empresa_id));
CREATE TABLE public.user_roles(user_id uuid, role public.app_role, PRIMARY KEY(user_id, role));
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE OR REPLACE FUNCTION public.pode_gerir_rh(_empresa_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_empresas WHERE user_id = auth.uid() AND empresa_id = _empresa_id)
     AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('rh','gestor'))
$$;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;


CREATE TABLE public.ponto_rep_dispositivos(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  nome text NOT NULL,
  unidade text NOT NULL,
  ativo boolean NOT NULL DEFAULT true
);
CREATE TABLE public.ponto_rep_funcionarios(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id uuid NOT NULL REFERENCES public.ponto_rep_dispositivos(id),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  codigo integer NOT NULL,
  nome text,
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  UNIQUE(dispositivo_id, codigo)
);
CREATE TABLE public.ponto_rep_dias(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id uuid NOT NULL REFERENCES public.ponto_rep_dispositivos(id),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  funcionario_codigo integer NOT NULL,
  data date NOT NULL,
  marcacoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  hash_conteudo text NOT NULL DEFAULT 'h',
  processado_em timestamptz,
  erro_processamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(dispositivo_id, funcionario_codigo, data)
);
CREATE TABLE public.batidas_ponto(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE RESTRICT,
  empresa_id uuid REFERENCES public.empresas(id),
  data date NOT NULL,
  hora time NOT NULL,
  ordem integer NOT NULL,
  tipo text NOT NULL DEFAULT 'entrada',
  origem text DEFAULT 'manual',
  ajustado boolean DEFAULT false,
  dispositivo_id text,
  is_offline boolean DEFAULT false,
  ip_address text,
  hash_digital text,
  hash_integridade text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(colaborador_id, data, ordem)
);
CREATE TABLE public.periodos_ponto(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id),
  data_inicio date,
  data_fim date,
  status varchar(20) DEFAULT 'aberto'
);
CREATE TABLE public.ponto_auditoria(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_nome text NOT NULL,
  registro_id uuid NOT NULL,
  acao text NOT NULL,
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario_id uuid,
  justificativa text,
  created_at timestamptz DEFAULT now()
);
-- Os dois gatilhos que a producao tem e a conversao precisa respeitar.
CREATE OR REPLACE FUNCTION public.gerar_hash_batida_ponto_stub() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN
  NEW.hash_digital := COALESCE(NULLIF(NEW.hash_digital,''), encode(extensions.digest(
    NEW.colaborador_id::text || NEW.data::text || NEW.hora::text || NEW.tipo ||
    COALESCE(NEW.dispositivo_id,'') || COALESCE(NEW.ip_address,''), 'sha256'), 'hex'));
  NEW.hash_integridade := COALESCE(NULLIF(NEW.hash_integridade,''), encode(extensions.digest(
    NEW.colaborador_id::text || '|' || NEW.data::text || '|' || NEW.hora::text || '|' ||
    NEW.tipo || '|' || COALESCE(NEW.dispositivo_id,''), 'sha256'), 'hex'));
  RETURN NEW;
END;
$$;
CREATE TRIGGER gerar_hash_batida_ponto_stub BEFORE INSERT ON public.batidas_ponto
FOR EACH ROW EXECUTE FUNCTION public.gerar_hash_batida_ponto_stub();

INSERT INTO public.empresas VALUES ('10000000-0000-0000-0000-00000000000a','Empresa A'),
                                   ('10000000-0000-0000-0000-00000000000b','Empresa B');
INSERT INTO public.colaboradores VALUES
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', NULL, 'Colab A');
INSERT INTO public.user_empresas VALUES
  ('00000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-00000000000a');
INSERT INTO public.user_roles VALUES
  ('00000000-0000-0000-0000-0000000000b1','rh'),
  ('00000000-0000-0000-0000-0000000000b2','user');
INSERT INTO public.ponto_rep_dispositivos VALUES
  ('20000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000a','Henry A','Matriz', true);
INSERT INTO public.ponto_rep_funcionarios(dispositivo_id, empresa_id, codigo, nome, colaborador_id) VALUES
  ('20000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-00000000000a', 1, 'Func A',
   '30000000-0000-0000-0000-00000000000a');
-- A Edge Function do relogio roda como service_role; no canonico ela tem
-- INSERT/UPDATE/SELECT nessas tabelas. O stub precisa refletir isso.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
SQL

run_psql -q -f /tmp/protecao.sql
run_psql -q -f /tmp/converter.sql
expect_eq "sidecar apos aplicar" "$(run_psql -qAt -f /tmp/converter.verify.sql)" "ok"
run_psql -q -f /tmp/converter.sql
expect_eq "sidecar apos aplicar 2x" "$(run_psql -qAt -f /tmp/converter.verify.sql)" "ok"

# Posicao do cartao -> tipo e ordem. E' o que garante idempotencia.
expect_eq "E1 -> entrada/1" "$(sql_val "SELECT tipo||'/'||ordem FROM public.ponto_rep_posicao_para_batida('E1');")" "entrada/1"
expect_eq "S1 -> saida/2" "$(sql_val "SELECT tipo||'/'||ordem FROM public.ponto_rep_posicao_para_batida('S1');")" "saida/2"
expect_eq "S6 -> saida/12" "$(sql_val "SELECT tipo||'/'||ordem FROM public.ponto_rep_posicao_para_batida('S6');")" "saida/12"
expect_eq "posicao desconhecida -> NULL" "$(sql_val "SELECT count(*) FROM public.ponto_rep_posicao_para_batida('X9');")" "0"

# Dia sem vinculo com colaborador nao vira batida: erro legivel, segue pendente.
run_psql -q -c "SET ROLE service_role; INSERT INTO public.ponto_rep_dias
  (dispositivo_id, empresa_id, funcionario_codigo, data, marcacoes)
  VALUES ('$DISP_A','$EMP_A', 99, '2026-11-18',
          '[{\"pos\":\"E1\",\"hora\":\"08:00\"},{\"pos\":\"S1\",\"hora\":\"12:00\"}]'::jsonb);"
run_psql -q -c "SET ROLE service_role; SELECT public.ponto_rep_processar_dias();" >/dev/null
expect_eq "dia sem vinculo nao cria batida" "$(sql_val "SELECT count(*) FROM public.batidas_ponto;")" "0"
expect_eq "dia sem vinculo fica pendente com erro" \
  "$(sql_val "SELECT processado_em IS NULL AND erro_processamento LIKE '%sem vinculo%' FROM public.ponto_rep_dias WHERE funcionario_codigo = 99;")" "t"

# Dia normal: 4 posicoes -> 4 batidas de origem relogio, ordem fixa por posicao.
run_psql -q -c "SET ROLE service_role; INSERT INTO public.ponto_rep_dias
  (id, dispositivo_id, empresa_id, funcionario_codigo, data, marcacoes)
  VALUES ('$DIA_A','$DISP_A','$EMP_A', 1, '2026-11-20',
          '[{\"pos\":\"E1\",\"hora\":\"08:00\"},{\"pos\":\"S1\",\"hora\":\"12:00\"},
            {\"pos\":\"E2\",\"hora\":\"13:00\"},{\"pos\":\"S2\",\"hora\":\"17:00\"}]'::jsonb);"
expect_eq "processar devolve batidas" "$(sql_val "SET ROLE service_role; SELECT batidas FROM public.ponto_rep_processar_dias();")" "4"
expect_eq "4 batidas gravadas" "$(sql_val "SELECT count(*) FROM public.batidas_ponto;")" "4"
expect_eq "todas de origem relogio" "$(sql_val "SELECT count(*) FROM public.batidas_ponto WHERE origem = 'relogio';")" "4"
expect_eq "ordem e tipo pela posicao" \
  "$(sql_val "SELECT string_agg(ordem||':'||tipo||':'||to_char(hora,'HH24:MI'), ',' ORDER BY ordem) FROM public.batidas_ponto;")" \
  "1:entrada:08:00,2:saida:12:00,3:entrada:13:00,4:saida:17:00"
expect_eq "batida do relogio tem os dois hashes" \
  "$(sql_val "SELECT count(*) FROM public.batidas_ponto WHERE hash_digital IS NOT NULL AND hash_integridade IS NOT NULL;")" "4"
expect_eq "dia processado" "$(sql_val "SELECT processado_em IS NOT NULL AND erro_processamento IS NULL FROM public.ponto_rep_dias WHERE id = '$DIA_A';")" "t"

# Reprocessar o mesmo dia nao duplica nada.
run_psql -q -c "SET ROLE service_role; SELECT public.ponto_rep_reprocessar_periodo('2026-11-20','2026-11-20');" >/dev/null
run_psql -q -c "SET ROLE service_role; SELECT public.ponto_rep_processar_dias();" >/dev/null
expect_eq "reprocessar nao duplica" "$(sql_val "SELECT count(*) FROM public.batidas_ponto;")" "4"
expect_eq "reprocessar nao gera auditoria" "$(sql_val "SELECT count(*) FROM public.ponto_auditoria;")" "0"

# Batida de outra origem na mesma posicao sobrevive e vira conflito registrado.
run_psql -q -c "SET ROLE service_role; INSERT INTO public.batidas_ponto
  (colaborador_id, empresa_id, data, hora, ordem, tipo, origem)
  VALUES ('$COLAB_A','$EMP_A','2026-11-21','13:10',3,'entrada','ajuste_manual');"
run_psql -q -c "SET ROLE service_role; INSERT INTO public.ponto_rep_dias
  (dispositivo_id, empresa_id, funcionario_codigo, data, marcacoes)
  VALUES ('$DISP_A','$EMP_A', 1, '2026-11-21',
          '[{\"pos\":\"E1\",\"hora\":\"08:00\"},{\"pos\":\"S1\",\"hora\":\"12:00\"},
            {\"pos\":\"E2\",\"hora\":\"13:00\"},{\"pos\":\"S2\",\"hora\":\"17:00\"}]'::jsonb);"
run_psql -q -c "SET ROLE service_role; SELECT public.ponto_rep_processar_dias();" >/dev/null
expect_eq "batida de outra origem preservada" \
  "$(sql_val "SELECT origem||'/'||to_char(hora,'HH24:MI') FROM public.batidas_ponto WHERE data = '2026-11-21' AND ordem = 3;")" \
  "ajuste_manual/13:10"
expect_eq "conflito registrado no dia" \
  "$(sql_val "SELECT erro_processamento LIKE '%conflito%' AND erro_processamento LIKE '%E2%' FROM public.ponto_rep_dias WHERE data = '2026-11-21';")" "t"
expect_eq "data com conflito tem 4 batidas (3 do relogio + 1 preservada)" \
  "$(sql_val "SELECT count(*) FROM public.batidas_ponto WHERE data = '2026-11-21';")" "4"

# Competencia fechada nao converte e explica o motivo.
run_psql -q -c "INSERT INTO public.periodos_ponto(empresa_id, data_inicio, data_fim, status)
  VALUES ('$EMP_A','2026-11-01','2026-11-30','fechado');"
run_psql -q -c "SET ROLE service_role; INSERT INTO public.ponto_rep_dias
  (dispositivo_id, empresa_id, funcionario_codigo, data, marcacoes)
  VALUES ('$DISP_A','$EMP_A', 1, '2026-11-22', '[{\"pos\":\"E1\",\"hora\":\"08:00\"}]'::jsonb);"
run_psql -q -c "SET ROLE service_role; SELECT public.ponto_rep_processar_dias();" >/dev/null
expect_eq "periodo fechado nao cria batida" "$(sql_val "SELECT count(*) FROM public.batidas_ponto WHERE data = '2026-11-22';")" "0"
expect_eq "periodo fechado explica o motivo" \
  "$(sql_val "SELECT erro_processamento LIKE 'periodo fechado%' FROM public.ponto_rep_dias WHERE data = '2026-11-22';")" "t"
run_psql -q -c "DELETE FROM public.periodos_ponto;"

# Correcao vinda do AtecSoft: UPDATE da propria batida do relogio + trilha.
ANTES="$(sql_val "SELECT hash_digital FROM public.batidas_ponto WHERE data = '2026-11-20' AND ordem = 3;")"
run_psql -q -c "SET ROLE service_role; UPDATE public.ponto_rep_dias
  SET marcacoes = '[{\"pos\":\"E1\",\"hora\":\"08:00\"},{\"pos\":\"S1\",\"hora\":\"12:00\"},
                    {\"pos\":\"E2\",\"hora\":\"13:20\"},{\"pos\":\"S2\",\"hora\":\"17:00\"}]'::jsonb
  WHERE id = '$DIA_A';"
run_psql -q -c "SET ROLE service_role; SELECT public.ponto_rep_reprocessar_periodo('2026-11-20','2026-11-20');" >/dev/null
expect_eq "reprocessar devolve o dia a pendente" "$(sql_val "SELECT processado_em IS NULL FROM public.ponto_rep_dias WHERE id = '$DIA_A';")" "t"
run_psql -q -c "SET ROLE service_role; SELECT public.ponto_rep_processar_dias();" >/dev/null
expect_eq "correcao reprocessa o dia" "$(sql_val "SELECT processado_em IS NOT NULL FROM public.ponto_rep_dias WHERE id = '$DIA_A';")" "t"
expect_eq "correcao reflete na batida" \
  "$(sql_val "SELECT to_char(hora,'HH24:MI') FROM public.batidas_ponto WHERE data = '2026-11-20' AND ordem = 3;")" "13:20"
expect_eq "correcao recalcula o hash" \
  "$(sql_val "SELECT hash_digital <> '$ANTES' FROM public.batidas_ponto WHERE data = '2026-11-20' AND ordem = 3;")" "t"
expect_eq "correcao deixa trilha em ponto_auditoria" \
  "$(sql_val "SELECT count(*) FROM public.ponto_auditoria WHERE acao = 'UPDATE' AND registro_id = (SELECT id FROM public.batidas_ponto WHERE data = '2026-11-20' AND ordem = 3);")" "1"
expect_eq "correcao nao cria batida nova" "$(sql_val "SELECT count(*) FROM public.batidas_ponto WHERE data = '2026-11-20';")" "4"

# Virada de dia: a data da propria marcacao manda (etapa 64).
run_psql -q -c "SET ROLE service_role; INSERT INTO public.ponto_rep_dias
  (dispositivo_id, empresa_id, funcionario_codigo, data, marcacoes)
  VALUES ('$DISP_A','$EMP_A', 1, '2026-11-23',
          '[{\"pos\":\"E1\",\"hora\":\"22:00\"},{\"pos\":\"S1\",\"hora\":\"06:00\",\"data\":\"2026-11-24\"}]'::jsonb);"
run_psql -q -c "SET ROLE service_role; SELECT public.ponto_rep_processar_dias();" >/dev/null
expect_eq "saida depois da meia-noite cai no dia seguinte" \
  "$(sql_val "SELECT data::text FROM public.batidas_ponto WHERE ordem = 2 AND hora = '06:00';")" "2026-11-24"

# O navegador nao converte nada: so a RPC de reprocessamento do RH e exposta.
expect_denied "SET ROLE anon; SELECT public.ponto_rep_converter_dia('$DIA_A');" "permission denied"
expect_denied "SET ROLE authenticated; SELECT public.ponto_rep_converter_dia('$DIA_A');" "permission denied"
expect_denied "SET ROLE authenticated; SELECT public.ponto_rep_processar_dias();" "permission denied"
expect_denied "SET ROLE authenticated; SELECT public.ponto_rep_reprocessar_periodo('2026-11-20','2026-11-20');" "permission denied"
expect_denied "SET ROLE authenticated; SELECT public.ponto_rep_posicao_para_batida('E1');" "permission denied"
expect_eq "RH reprocessa a propria empresa" \
  "$(as_user authenticated "$RH_A" "SELECT public.reprocessar_ponto_relogio('2026-11-20','2026-11-20','$EMP_A');")" "1"
expect_eq "usuario comum nao reprocessa" \
  "$(as_user authenticated "$COMUM_A" "SELECT public.reprocessar_ponto_relogio('2026-11-20','2026-11-20','$EMP_A');" 2>&1 | grep -c "Sem permissao" || true)" "1"
expect_denied "SET ROLE authenticated; SELECT public.reprocessar_ponto_relogio('2026-11-20','2026-11-20','$EMP_B');" "Sessao obrigatoria"

echo "conversao do dia do relogio em batida conferida (etapa 41)"