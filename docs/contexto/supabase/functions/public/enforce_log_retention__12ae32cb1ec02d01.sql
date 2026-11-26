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
$function$
