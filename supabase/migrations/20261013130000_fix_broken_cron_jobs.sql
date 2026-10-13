-- Onda 3a (levantamento 2026-10-12, H-AGD-01..08/11/15): conserta os jobs de
-- pg_cron que falham em produção e agenda os que nunca foram agendados.
-- Diagnóstico de prod (12/10): 223 falhas / 5.315 execuções em 7 dias.
-- Tudo idempotente: pode reaplicar sem efeito.

-- ── 1) purge_rate_limits: função inexistente (168 falhas/7d, H-AGD-01) ──────
CREATE OR REPLACE FUNCTION public.purge_rate_limits(p_older_than_sec integer DEFAULT 86400)
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cutoff  bigint := EXTRACT(EPOCH FROM now())::bigint - GREATEST(p_older_than_sec, 3600);
  v_deleted integer;
BEGIN
  DELETE FROM public.rate_limits WHERE "timestamp" < v_cutoff;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
REVOKE ALL ON FUNCTION public.purge_rate_limits(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_rate_limits(integer) TO service_role;

-- ── 2) Status diário das férias: job chama função de TRIGGER (7/7, H-AGD-03)
-- Wrapper void que replica as transições do trigger para a tabela toda.
-- Três regras, todas respeitando o gatilho CLT Art. 145
-- (ferias_bloquear_gozo_sem_pagamento exige pagamento_confirmado_em):
--   a) aprovada paga dentro da janela       -> em_gozo
--   b) em_gozo com fim ultrapassado         -> concluida
--   c) aprovada PAGA com fim ultrapassado   -> concluida (reconciliação:
--      enquanto o job esteve quebrado, férias pagas venceram sem nunca
--      terem passado por em_gozo e ficariam 'aprovada' para sempre)
-- Férias aprovadas SEM pagamento ficam intocadas em qualquer caso: são a
-- violação que a v_ferias_alerta_pagamento_d2 sinaliza ('violacao_grave')
-- e não devem nem entrar em gozo nem ser marcadas como concluídas.
CREATE OR REPLACE FUNCTION public.fn_atualizar_status_ferias_diario()
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_total integer := 0; v_n integer;
BEGIN
  UPDATE public.ferias SET status = 'em_gozo'
   WHERE status = 'aprovada'
     AND pagamento_confirmado_em IS NOT NULL
     AND CURRENT_DATE BETWEEN data_inicio AND data_fim;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;
  UPDATE public.ferias SET status = 'concluida'
   WHERE status = 'em_gozo' AND CURRENT_DATE > data_fim;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;
  UPDATE public.ferias SET status = 'concluida'
   WHERE status = 'aprovada'
     AND pagamento_confirmado_em IS NOT NULL
     AND CURRENT_DATE > data_fim;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;
  RETURN v_total;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_atualizar_status_ferias_diario() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_atualizar_status_ferias_diario() TO service_role;

-- ── 3) fn_cleanup_old_logs sem guarda (15 falhas/7d, H-AGD-05) ─────────────
CREATE OR REPLACE FUNCTION public.fn_cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF to_regclass('public.logs_sistema') IS NOT NULL THEN
    DELETE FROM public.logs_sistema WHERE created_at < now() - interval '30 days';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_cleanup_old_logs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cleanup_old_logs() TO service_role;

-- ── 4) Fila LGPD: recria drenar + process (14/14 falhas, H-AGD-06) ─────────
-- As duas migrações que criariam a versão corrigida nunca foram aplicadas em
-- produção; recria aqui com o corpo canônico (idempotente).
CREATE TABLE IF NOT EXISTS public.lgpd_fila_limpeza (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela          text NOT NULL,
  registro_id     uuid NOT NULL,
  data_programada date NOT NULL DEFAULT current_date,
  executado       boolean NOT NULL DEFAULT false,
  processed_at    timestamptz,
  dry_run         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.drenar_fila_limpeza_lgpd(p_limite integer DEFAULT 200)
RETURNS TABLE(id uuid, tabela text, registro_id uuid, sucesso boolean, erro text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT f.id, f.tabela, f.registro_id, f.dry_run
      FROM public.lgpd_fila_limpeza f
     WHERE f.executado = false
       AND f.data_programada <= current_date
     ORDER BY f.data_programada
     LIMIT GREATEST(COALESCE(p_limite, 200), 1)
     FOR UPDATE SKIP LOCKED
  LOOP
    id          := item.id;
    tabela      := item.tabela;
    registro_id := item.registro_id;
    erro        := NULL;
    BEGIN
      IF item.dry_run THEN
        sucesso := true;
        RETURN NEXT;
        CONTINUE;
      END IF;
      IF item.tabela = 'colaboradores' THEN
        PERFORM public.anonimizar_dados_pessoais(item.registro_id);
      ELSE
        RAISE EXCEPTION 'tabela nao suportada para anonimizacao: %', item.tabela;
      END IF;
      UPDATE public.lgpd_fila_limpeza
         SET executado = true, processed_at = now()
       WHERE lgpd_fila_limpeza.id = item.id;
      sucesso := true;
    EXCEPTION WHEN others THEN
      -- Um item problemático não pode abortar a fila inteira.
      sucesso := false;
      erro    := SQLERRM;
    END;
    RETURN NEXT;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.drenar_fila_limpeza_lgpd(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.drenar_fila_limpeza_lgpd(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.process_lgpd_cleanup_queue()
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_processed integer := 0;
BEGIN
  SELECT count(*)::integer INTO v_processed
    FROM public.drenar_fila_limpeza_lgpd(500) d
   WHERE d.sucesso;
  RETURN v_processed;
END;
$$;

-- ── 5) Re-agendamentos + dedupe (H-AGD-03/08/11/15) ────────────────────────
-- Condicionado ao pg_cron: ambientes de replay/preview sem a extensão
-- pulam o agendamento em vez de abortar a migration.
DO $$
DECLARE
  -- jobs redundantes (mesma função sob nome lovable-* / duplicado)
  dupes text[] := ARRAY[
    'lovable-purge-idempotency-keys',
    'lovable-purge-lock-conflicts',
    'lovable-purge-security-data',
    'lovable-cleanup-security-logs',
    'lovable-check-idempotency-anomalies',
    'lovable-lgpd-cleanup-queue',
    'lgpd-cleanup-daily',
    'cleanup-logs-daily',
    'ferias-atualizar-status-diario'
  ];
  j text;
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
    RAISE NOTICE 'pg_cron ausente — agendamentos pulados neste ambiente';
    RETURN;
  END IF;

  FOREACH j IN ARRAY dupes LOOP
    BEGIN
      PERFORM cron.unschedule(j);
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;

  -- férias: status diário via wrapper correto (o job antigo chamava o trigger)
  PERFORM cron.schedule('ferias-atualizar-status-diario', '30 3 * * *',
    'SELECT public.fn_atualizar_status_ferias_diario()');

  -- LGPD fila: um job só, sob o nome definitivo
  PERFORM cron.schedule('lgpd-fila-drenagem-daily', '45 4 * * *',
    'SELECT public.process_lgpd_cleanup_queue()');

  -- detecção de exfiltração PII nunca foi agendada (H-AGD-11)
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='fn_alert_pii_access_anomaly') THEN
    PERFORM cron.schedule('pii-access-anomaly-daily', '15 6 * * *',
      'SELECT public.fn_alert_pii_access_anomaly(24)');
  END IF;

  -- refresh da única matview existente em prod (H-AGD-08)
  IF to_regclass('public.mv_telemetry_dashboard') IS NOT NULL THEN
    PERFORM cron.schedule('refresh-telemetry-mv', '*/30 * * * *',
      'REFRESH MATERIALIZED VIEW public.mv_telemetry_dashboard');
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='refresh_dashboard_mvs') THEN
    PERFORM cron.schedule('refresh-dashboard-mvs-daily', '0 5 * * *',
      'SELECT public.refresh_dashboard_mvs()');
  END IF;
END $$;

-- fail-closed: os jobs que corrigimos devem existir no fim da migration.
DO $$
DECLARE
  required_jobs text[] := ARRAY[
    'ferias-atualizar-status-diario',
    'lgpd-fila-drenagem-daily'
  ];
  j text;
BEGIN
  IF to_regnamespace('cron') IS NULL THEN
    RETURN;
  END IF;

  FOREACH j IN ARRAY required_jobs LOOP
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      RAISE EXCEPTION 'job "%" não foi agendado', j;
    END IF;
  END LOOP;
END $$;
