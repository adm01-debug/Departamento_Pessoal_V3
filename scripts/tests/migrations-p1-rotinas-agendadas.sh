#!/usr/bin/env bash
# Validates the fixes for the four pg_cron jobs that failed on every run in the
# canonical database, in disposable PostgreSQL.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATION="$REPO_ROOT/supabase/migrations/20261012130000_rotinas_agendadas_falhando.sql"
IMAGE="${MIGTEST_IMAGE:-postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24}"
NAME="dp-p1-rotinas-agendadas-$$"

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
test -f "$MIGRATION" || { echo "migration not found: $MIGRATION" >&2; exit 1; }

cleanup() {
  [ "${MIGTEST_KEEP:-0}" = "1" ] || docker rm -f "$NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

run_psql() {
  if [ "$#" -eq 0 ]; then
    docker exec -i "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1
  else
    docker exec "$NAME" psql -X -U postgres -v ON_ERROR_STOP=1 "$@"
  fi
}

q() { run_psql -Atc "$1"; }

expect_eq() {
  local label="$1" got="$2" want="$3"
  [ "$got" = "$want" ] || { echo "$label: expected '$want', got '$got'" >&2; exit 1; }
}

expect_sql_error() {
  local label="$1" sql="$2" fragment="$3" output status
  set +e
  output="$(run_psql -c "$sql" 2>&1)"
  status=$?
  set -e
  [ "$status" -ne 0 ] && [[ "$output" == *"$fragment"* ]] || {
    echo "$label: expected failure containing '$fragment'" >&2
    echo "$output" >&2
    exit 1
  }
}

echo "Starting disposable $IMAGE database: $NAME"
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test "$IMAGE" >/dev/null

bash "$REPO_ROOT/scripts/tests/wait-for-postgres-container.sh" "$NAME"

docker cp "$MIGRATION" "$NAME":/tmp/p1-rotinas-agendadas.sql

# Fixture: live canonical shape, with the four broken routines as they run today.
run_psql >/dev/null <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);

-- pg_cron stub with the same contract the migration relies on.
CREATE SCHEMA cron;
CREATE TABLE cron.job (jobid bigserial PRIMARY KEY, jobname text UNIQUE, schedule text, command text);
CREATE FUNCTION cron.schedule(job_name text, schedule text, command text) RETURNS bigint LANGUAGE sql AS $$
  INSERT INTO cron.job (jobname, schedule, command) VALUES (job_name, schedule, command)
  ON CONFLICT (jobname) DO UPDATE SET schedule = EXCLUDED.schedule, command = EXCLUDED.command
  RETURNING jobid $$;
CREATE FUNCTION cron.unschedule(job_name text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM cron.job WHERE jobname = job_name;
  IF NOT FOUND THEN RAISE EXCEPTION 'could not find valid entry for job ''%''', job_name; END IF;
  RETURN true;
END $$;
INSERT INTO cron.job (jobname, schedule, command) VALUES
  ('purge-rate-limits-hourly', '7 * * * *', 'SELECT public.purge_rate_limits(86400);'),
  ('ferias-atualizar-status-diario', '30 3 * * *', 'SELECT fn_update_ferias_status_by_date()'),
  ('lgpd-cleanup-daily', '15 4 * * *', 'SELECT public.process_lgpd_cleanup_queue();'),
  ('notificar-ferias-pagamento-d5', '0 11 * * 1-5', 'SELECT public.notificar_ferias_pagamento_d5();');

CREATE TABLE public.logs_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nivel text NOT NULL, mensagem text NOT NULL, contexto jsonb, created_at timestamptz DEFAULT now()
);

CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL, "timestamp" bigint NOT NULL
);

CREATE TABLE public.colaboradores (id uuid PRIMARY KEY, nome_completo text NOT NULL);
CREATE TABLE public.lgpd_fila_limpeza (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), registro_id uuid NOT NULL, tabela text NOT NULL,
  data_programada date NOT NULL, executado boolean DEFAULT false, dry_run boolean NOT NULL DEFAULT false,
  processed_at timestamptz
);
-- Anonimização: falha para o registro marcado, como a versão viva falha por colaboradores.metadata.
CREATE FUNCTION public.anonimizar_dados_pessoais(target_id uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.colaboradores WHERE id = target_id AND nome_completo = 'QUEBRA') THEN
    RAISE EXCEPTION 'column "metadata" does not exist';
  END IF;
  UPDATE public.colaboradores SET nome_completo = 'COLABORADOR ANONIMIZADO (LGPD)' WHERE id = target_id;
END $$;
-- Versão viva (colunas inexistentes).
CREATE FUNCTION public.process_lgpd_cleanup_queue() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE v_processed integer := 0;
BEGIN
  UPDATE public.lgpd_fila_limpeza SET status = 'processado', processado_em = now()
   WHERE status = 'pendente' AND data_prevista_limpeza <= now();
  GET DIAGNOSTICS v_processed = ROW_COUNT;
  RETURN v_processed;
END $$;

CREATE TABLE public.ferias (
  id uuid PRIMARY KEY, status varchar NOT NULL, data_inicio date NOT NULL, data_fim date NOT NULL,
  cancelado boolean DEFAULT false, pago boolean DEFAULT false,
  CONSTRAINT ferias_status_check CHECK (status::text IN ('programada','aprovada','em_gozo','concluida','cancelada'))
);
CREATE FUNCTION public.fn_update_ferias_status_by_date() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.status = 'aprovada' AND CURRENT_DATE BETWEEN NEW.data_inicio AND NEW.data_fim) THEN
    NEW.status = 'em_gozo';
  ELSIF (NEW.status = 'em_gozo' AND CURRENT_DATE > NEW.data_fim) THEN
    NEW.status = 'concluida';
  END IF;
  RETURN NEW;
END $$;
CREATE FUNCTION public.trg_ferias_bloquear_gozo_sem_pagamento() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'em_gozo' AND OLD.status IS DISTINCT FROM 'em_gozo' AND NOT NEW.pago THEN
    RAISE EXCEPTION 'Art. 145 CLT: férias sem pagamento não podem entrar em gozo';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ferias_bloquear_gozo_sem_pagamento BEFORE UPDATE OF status ON public.ferias
FOR EACH ROW EXECUTE FUNCTION public.trg_ferias_bloquear_gozo_sem_pagamento();

CREATE TABLE public.user_roles (user_id uuid, role text);
CREATE TABLE public.user_empresas (user_id uuid, empresa_id uuid);
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id), tipo text NOT NULL, titulo text NOT NULL, mensagem text NOT NULL,
  entidade_tipo text, entidade_id uuid, lida boolean DEFAULT false, data_referencia date, empresa_id uuid,
  CONSTRAINT chk_notificacoes_tipo CHECK (tipo IS NULL OR tipo IN (
    'info','sucesso','aviso','erro','sistema','ponto','ferias','folha','beneficio','documento',
    'avaliacao','treinamento','admissao','desligamento'))
);
CREATE UNIQUE INDEX uq_notif_ferias_d5_dia ON public.notificacoes (user_id, entidade_tipo, entidade_id, data_referencia)
  WHERE tipo = 'ferias_pagamento_d5';
CREATE VIEW public.v_ferias_alerta_pagamento_d2 AS
  SELECT f.id, '00000000-0000-0000-0000-0000000000e1'::uuid AS empresa_id, f.id AS colaborador_id,
         f.data_inicio, (f.data_inicio - CURRENT_DATE) AS dias_ate_inicio, 'violacao_grave'::text AS severidade
    FROM public.ferias f WHERE NOT f.pago;
-- Versão viva da função D-5.
CREATE FUNCTION public.notificar_ferias_pagamento_d5() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE v_alerta RECORD; v_user RECORD; v_count INT := 0;
BEGIN
  FOR v_alerta IN SELECT id, empresa_id, colaborador_id, data_inicio, dias_ate_inicio, severidade
                    FROM public.v_ferias_alerta_pagamento_d2
                   WHERE severidade IN ('atencao','critico','violacao_grave') LOOP
    FOR v_user IN SELECT DISTINCT ur.user_id FROM public.user_roles ur
                    JOIN public.user_empresas ue ON ue.user_id = ur.user_id
                   WHERE ue.empresa_id = v_alerta.empresa_id AND ur.role::text IN ('admin','rh') LOOP
      INSERT INTO public.notificacoes (user_id, empresa_id, tipo, titulo, mensagem, entidade_tipo, entidade_id, data_referencia, lida)
      VALUES (v_user.user_id, v_alerta.empresa_id, 'ferias_pagamento_d5', 'Férias', 'msg', 'ferias', v_alerta.id, CURRENT_DATE, false)
      ON CONFLICT DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  RETURN v_count;
END $$;

INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-0000000000a1');
INSERT INTO public.user_roles VALUES ('00000000-0000-0000-0000-0000000000a1', 'admin');
INSERT INTO public.user_empresas VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1');

INSERT INTO public.rate_limits (key, "timestamp") VALUES
  ('velho', extract(epoch from now())::bigint - 200000),
  ('recente', extract(epoch from now())::bigint - 60);

INSERT INTO public.colaboradores VALUES
  ('00000000-0000-0000-0000-00000000c001', 'Ana'),
  ('00000000-0000-0000-0000-00000000c002', 'QUEBRA'),
  ('00000000-0000-0000-0000-00000000c003', 'Futuro'),
  ('00000000-0000-0000-0000-00000000c004', 'Simulado');
INSERT INTO public.lgpd_fila_limpeza (id, registro_id, tabela, data_programada, dry_run) VALUES
  ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-00000000c001', 'colaboradores', CURRENT_DATE - 1, false),
  ('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-00000000c002', 'colaboradores', CURRENT_DATE - 1, false),
  ('00000000-0000-0000-0000-00000000f003', '00000000-0000-0000-0000-00000000c003', 'colaboradores', CURRENT_DATE + 30, false),
  ('00000000-0000-0000-0000-00000000f004', '00000000-0000-0000-0000-00000000c004', 'colaboradores', CURRENT_DATE - 1, true);

INSERT INTO public.ferias (id, status, data_inicio, data_fim, cancelado, pago) VALUES
  ('00000000-0000-0000-0000-0000000000f1', 'aprovada', CURRENT_DATE - 2, CURRENT_DATE + 10, false, true),
  ('00000000-0000-0000-0000-0000000000f2', 'aprovada', CURRENT_DATE - 2, CURRENT_DATE + 10, false, false),
  ('00000000-0000-0000-0000-0000000000f3', 'em_gozo',  CURRENT_DATE - 20, CURRENT_DATE - 6, false, true),
  ('00000000-0000-0000-0000-0000000000f4', 'aprovada', CURRENT_DATE - 2, CURRENT_DATE + 10, true, true);
SQL

# Reproduz as quatro falhas vivas.
expect_sql_error 'rate-limit antes' 'SELECT public.purge_rate_limits(86400)' 'does not exist'
expect_sql_error 'fila LGPD antes' 'SELECT public.process_lgpd_cleanup_queue()' 'does not exist'
expect_sql_error 'status férias antes' 'SELECT fn_update_ferias_status_by_date()' 'trigger'
expect_sql_error 'aviso D-5 antes' 'SELECT public.notificar_ferias_pagamento_d5()' 'chk_notificacoes_tipo'

for pass in 1 2; do
  run_psql -f /tmp/p1-rotinas-agendadas.sql >/dev/null
  echo "migration pass $pass succeeded"
done

# 1) Rate-limit: só o contador vencido sai.
expect_eq 'purge_rate_limits removidos' "$(q 'SELECT public.purge_rate_limits(86400)')" 1
expect_eq 'contador recente preservado' "$(q "SELECT string_agg(key, ',') FROM public.rate_limits")" 'recente'

# 2) Fila LGPD: anonimiza o vencido, isola a falha, ignora o futuro e não executa o simulado.
expect_eq 'itens com sucesso (real + simulado)' "$(q 'SELECT public.process_lgpd_cleanup_queue()')" 2
expect_eq 'estado da fila' \
  "$(q "SELECT string_agg(right(id::text, 4) || ':' || executado, ',' ORDER BY id) FROM public.lgpd_fila_limpeza")" \
  'f001:true,f002:false,f003:false,f004:false'
expect_eq 'colaborador anonimizado' "$(q "SELECT nome_completo FROM public.colaboradores WHERE id = '00000000-0000-0000-0000-00000000c001'")" 'COLABORADOR ANONIMIZADO (LGPD)'
expect_eq 'falha registrada' \
  "$(q "SELECT jsonb_array_length(contexto->'falhas') FROM public.logs_sistema WHERE contexto->>'job' = 'lgpd_cleanup_queue'")" 1

# 3) Férias: entra em gozo só se pago; conclui o que passou; ignora cancelada.
expect_eq 'resultado do job de férias' "$(q 'SELECT public.fn_atualizar_status_ferias_diario()')" '{"recusadas": 1, "atualizadas": 2}'
expect_eq 'status após o job' \
  "$(q "SELECT string_agg(right(id::text, 2) || ':' || status, ',' ORDER BY id) FROM public.ferias")" \
  'f1:em_gozo,f2:aprovada,f3:concluida,f4:aprovada'
expect_eq 'recusa Art. 145 registrada' \
  "$(q "SELECT count(*) FROM public.logs_sistema WHERE nivel = 'warning' AND contexto->>'job' = 'ferias_status_diario'")" 1

# 4) Aviso D-5: grava e deduplica no mesmo dia.
q 'SELECT public.notificar_ferias_pagamento_d5()' >/dev/null
q 'SELECT public.notificar_ferias_pagamento_d5()' >/dev/null
expect_eq 'notificação D-5 única por dia' "$(q "SELECT count(*) FROM public.notificacoes WHERE tipo = 'ferias_pagamento_d5'")" 1

# Agenda: comandos novos, horários preservados, demais jobs intactos.
expect_eq 'job rate-limit' "$(q "SELECT schedule || '|' || command FROM cron.job WHERE jobname = 'purge-rate-limits-hourly'")" '7 * * * *|SELECT public.purge_rate_limits(86400);'
expect_eq 'job status férias' "$(q "SELECT schedule || '|' || command FROM cron.job WHERE jobname = 'ferias-atualizar-status-diario'")" '30 3 * * *|SELECT public.fn_atualizar_status_ferias_diario();'
expect_eq 'total de jobs' "$(q 'SELECT count(*) FROM cron.job')" 4

for fn in 'public.purge_rate_limits(integer)' 'public.drenar_fila_limpeza_lgpd(integer)' 'public.fn_atualizar_status_ferias_diario()'; do
  expect_eq "$fn fechado para authenticated" "$(q "SELECT has_function_privilege('authenticated', '$fn', 'EXECUTE')")" f
done

# Pré-condição fail-closed: sem pg_cron a migration não segue.
run_psql -c 'CREATE DATABASE p1_rotinas_sem_cron' >/dev/null
set +e
missing="$(docker exec -i "$NAME" psql -X -U postgres -d p1_rotinas_sem_cron -v ON_ERROR_STOP=1 -f /tmp/p1-rotinas-agendadas.sql 2>&1)"
status=$?
set -e
[ "$status" -ne 0 ] && [[ "$missing" == *'requires pg_cron'* ]] || {
  echo "expected fail-closed precondition error" >&2
  echo "$missing" >&2
  exit 1
}

echo 'P1_ROTINAS_AGENDADAS_MIGRATION_OK: reproduced the four live job failures and validated rate-limit purge, LGPD queue drain with per-item isolation, vacation status job under Art. 145, deduplicated D-5 notice, preserved schedules and fail-closed precondition.'
