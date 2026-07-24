
-- ferias_reconciliacao_logs was created in 20260723122004 without empresa_id;
-- this function queries by empresa_id, so we add it here idempotently.
ALTER TABLE public.ferias_reconciliacao_logs
  ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id);

CREATE INDEX IF NOT EXISTS idx_ferias_reconciliacao_logs_empresa
  ON public.ferias_reconciliacao_logs(empresa_id, executado_em DESC);

CREATE OR REPLACE FUNCTION public.notificar_ferias_reconciliacao_sla_baixo()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold NUMERIC := 80;
  v_empresa RECORD;
  v_sla_ontem NUMERIC;
  v_sla_anteontem NUMERIC;
  v_total_ontem INT;
  v_total_anteontem INT;
  v_alertados INT := 0;
  v_empresas_afetadas INT := 0;
  v_hoje DATE := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_ontem DATE := v_hoje - 1;
  v_anteontem DATE := v_hoje - 2;
BEGIN
  FOR v_empresa IN
    SELECT DISTINCT empresa_id
    FROM public.ferias_reconciliacao_logs
    WHERE empresa_id IS NOT NULL
      AND executado_em >= (v_anteontem::timestamp AT TIME ZONE 'America/Sao_Paulo')
      AND executado_em <  ((v_hoje)::timestamp AT TIME ZONE 'America/Sao_Paulo')
  LOOP
    SELECT
      COUNT(*),
      ROUND(100.0 * COUNT(*) FILTER (WHERE restantes = 0) / NULLIF(COUNT(*),0), 2)
      INTO v_total_ontem, v_sla_ontem
    FROM public.ferias_reconciliacao_logs
    WHERE empresa_id = v_empresa.empresa_id
      AND (executado_em AT TIME ZONE 'America/Sao_Paulo')::date = v_ontem;

    SELECT
      COUNT(*),
      ROUND(100.0 * COUNT(*) FILTER (WHERE restantes = 0) / NULLIF(COUNT(*),0), 2)
      INTO v_total_anteontem, v_sla_anteontem
    FROM public.ferias_reconciliacao_logs
    WHERE empresa_id = v_empresa.empresa_id
      AND (executado_em AT TIME ZONE 'America/Sao_Paulo')::date = v_anteontem;

    IF COALESCE(v_total_ontem,0) = 0 OR COALESCE(v_total_anteontem,0) = 0 THEN
      CONTINUE;
    END IF;

    IF v_sla_ontem >= v_threshold OR v_sla_anteontem >= v_threshold THEN
      CONTINUE;
    END IF;

    v_empresas_afetadas := v_empresas_afetadas + 1;

    INSERT INTO public.notificacoes (user_id, empresa_id, tipo, titulo, mensagem, entidade_tipo, lida, data_referencia)
    SELECT
      ue.user_id,
      v_empresa.empresa_id,
      'sla_reconciliacao_ferias',
      'SLA de reconciliação de férias abaixo do alvo (2 dias)',
      format('SLA %s%% (ontem) e %s%% (anteontem) — alvo ≥ %s%%. Verifique o cron reconciliar_ferias_folha_batch.',
             v_sla_ontem, v_sla_anteontem, v_threshold),
      'ferias_reconciliacao',
      false,
      v_hoje
    FROM public.user_empresas ue
    JOIN public.user_roles ur ON ur.user_id = ue.user_id
    WHERE ue.empresa_id = v_empresa.empresa_id
      AND ur.role IN ('admin','rh')
      AND NOT EXISTS (
        SELECT 1 FROM public.notificacoes n
        WHERE n.user_id = ue.user_id
          AND n.tipo = 'sla_reconciliacao_ferias'
          AND n.data_referencia = v_hoje
      );

    GET DIAGNOSTICS v_alertados = ROW_COUNT;
  END LOOP;

  RETURN jsonb_build_object(
    'executado_em', now(),
    'empresas_afetadas', v_empresas_afetadas,
    'notificacoes_enviadas', v_alertados,
    'threshold', v_threshold
  );
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_ferias_reconciliacao_sla_baixo() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notificar_ferias_reconciliacao_sla_baixo() TO service_role;

DO $$
DECLARE v_jobid INT;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'ferias_reconciliacao_sla_alert_daily';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
  PERFORM cron.schedule(
    'ferias_reconciliacao_sla_alert_daily',
    '15 11 * * *',
    $cron$SELECT public.notificar_ferias_reconciliacao_sla_baixo();$cron$
  );
END$$;
