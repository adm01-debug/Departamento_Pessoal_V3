-- fix: enforce_log_retention() falhava todos os dias e desfazia a retencao.
--
-- Causa (arquivo:linha do defeito): a ultima instrucao da funcao era
--   INSERT INTO public.metricas_processamento (tipo, valor, metadata, timestamp)
-- (supabase/migrations/20261014120000_fix_cron_jobs_onda3b.sql:184), mas a
-- tabela nunca teve essas colunas. A 20260522151147 criou metricas_processamento
-- com id, funcao_nome, status, tempo_execucao_ms, timestamp — o mesmo contrato
-- usado por supabase/functions/_shared/monitor.ts:20-22.
--
-- Efeito: SQLSTATE 42703 (undefined_column) abortava a funcao inteira e, junto
-- dela, os DELETEs de retencao que vem ANTES no mesmo bloco:
--   audit_log_unified 180d / security_alerts 90d / query_telemetry 30d /
--   metricas_processamento 30d / login_attempts 90d.
-- A retencao de logs nunca foi aplicada em producao e o job falhava todo dia.
--
-- Evidencia lida no canonico em 26/11/2026 (read-only):
--  * cron.job 35 = 'lovable-log-retention' / '0 3 * * *' / active = true,
--    comando 'SELECT public.enforce_log_retention();';
--  * cron.job_run_details jobid=35: status=failed em 23, 24, 25 e 26/11 03:00 UTC
--    com 'column "tipo" of relation "metricas_processamento" does not exist';
--  * pg_proc.prosrc de public.enforce_log_retention continha
--    'metricas_processamento (tipo, valor, metadata, timestamp)' = true;
--  * information_schema.columns de metricas_processamento = id, funcao_nome,
--    status, tempo_execucao_ms, timestamp.
--
-- Correcao: grava a execucao com as colunas reais e ISOLA a telemetria em um
-- bloco com EXCEPTION — falha de metrica nunca mais pode desfazer a retencao,
-- que e obrigacao de politica (LGPD), enquanto a metrica e observabilidade.
-- O jsonb de retorno (contagem por tabela) fica identico: e ele que o cron
-- registra em job_run_details.
--
-- Idempotente: CREATE OR REPLACE FUNCTION, sem DDL destrutivo.

CREATE OR REPLACE FUNCTION public.enforce_log_retention()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_started_at TIMESTAMPTZ := clock_timestamp();
  v_audit_deleted BIGINT := 0;
  v_alerts_deleted BIGINT := 0;
  v_telemetry_deleted BIGINT := 0;
  v_metricas_deleted BIGINT := 0;
  v_login_deleted BIGINT := 0;
  v_result JSONB;
BEGIN
  -- 180d: audit_log_unified
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_log_unified') THEN
    DELETE FROM public.audit_log_unified WHERE occurred_at < (now() - INTERVAL '180 days');
    GET DIAGNOSTICS v_audit_deleted = ROW_COUNT;
  END IF;

  -- 90d: alertas de segurança resolvidos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='security_alerts') THEN
    DELETE FROM public.security_alerts
      WHERE resolved = true AND COALESCE(resolved_at, created_at) < (now() - INTERVAL '90 days');
    GET DIAGNOSTICS v_alerts_deleted = ROW_COUNT;
  END IF;

  -- 30d: telemetria de queries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='query_telemetry') THEN
    DELETE FROM public.query_telemetry WHERE created_at < (now() - INTERVAL '30 days');
    GET DIAGNOSTICS v_telemetry_deleted = ROW_COUNT;
  END IF;

  -- 30d: métricas de processamento
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='metricas_processamento') THEN
    DELETE FROM public.metricas_processamento WHERE timestamp < (now() - INTERVAL '30 days');
    GET DIAGNOSTICS v_metricas_deleted = ROW_COUNT;
  END IF;

  -- 90d: tentativas de login (evita brute-force histórico inútil)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='login_attempts') THEN
    DELETE FROM public.login_attempts WHERE created_at < (now() - INTERVAL '90 days');
    GET DIAGNOSTICS v_login_deleted = ROW_COUNT;
  END IF;

  v_result := jsonb_build_object(
    'audit_log_unified', v_audit_deleted,
    'security_alerts_resolved', v_alerts_deleted,
    'query_telemetry', v_telemetry_deleted,
    'metricas_processamento', v_metricas_deleted,
    'login_attempts', v_login_deleted,
    'executed_at', now()
  );

  -- Registra o resultado. Colunas reais de metricas_processamento
  -- (20260522151147) e mesmo contrato do monitor das edges.
  -- O bloco EXCEPTION e proposital: metrica quebrada nao pode abortar (nem
  -- desfazer) a retencao.
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='metricas_processamento') THEN
    BEGIN
      INSERT INTO public.metricas_processamento (funcao_nome, status, tempo_execucao_ms, timestamp)
      VALUES (
        'enforce_log_retention',
        'success',
        GREATEST(0, (EXTRACT(EPOCH FROM (clock_timestamp() - v_started_at)) * 1000)::int),
        now()
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_log_retention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_log_retention() TO service_role;