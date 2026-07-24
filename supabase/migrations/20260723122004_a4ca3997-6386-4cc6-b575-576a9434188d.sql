CREATE TABLE IF NOT EXISTS public.ferias_reconciliacao_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executado_em timestamptz NOT NULL DEFAULT now(),
  verificadas  integer NOT NULL DEFAULT 0,
  corrigidas   integer NOT NULL DEFAULT 0,
  restantes    integer NOT NULL DEFAULT 0,
  duracao_ms   integer NOT NULL DEFAULT 0,
  detalhes     jsonb   NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT ON public.ferias_reconciliacao_logs TO authenticated;
GRANT ALL    ON public.ferias_reconciliacao_logs TO service_role;

ALTER TABLE public.ferias_reconciliacao_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reconciliacao_logs_admin_read" ON public.ferias_reconciliacao_logs;
CREATE POLICY "reconciliacao_logs_admin_read"
ON public.ferias_reconciliacao_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'gestor')
  OR public.has_role(auth.uid(), 'rh')
);

CREATE OR REPLACE FUNCTION public.reconciliar_ferias_folha_batch()
RETURNS public.ferias_reconciliacao_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_started    timestamptz := clock_timestamp();
  v_verificadas int := 0;
  v_corrigidas  int := 0;
  v_restantes   int := 0;
  v_row  record;
  v_log  public.ferias_reconciliacao_logs;
BEGIN
  FOR v_row IN
    SELECT ferias_id
    FROM public.v_ferias_folha_reconciliacao
    WHERE situacao = 'divergente'
    LIMIT 500
  LOOP
    v_verificadas := v_verificadas + 1;
    BEGIN
      PERFORM public.gerar_rubricas_ferias(v_row.ferias_id);
      v_corrigidas := v_corrigidas + 1;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  SELECT COUNT(*) INTO v_restantes
  FROM public.v_ferias_folha_reconciliacao
  WHERE situacao = 'divergente';

  INSERT INTO public.ferias_reconciliacao_logs (
    verificadas, corrigidas, restantes, duracao_ms
  ) VALUES (
    v_verificadas, v_corrigidas, v_restantes,
    (EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000)::int
  ) RETURNING * INTO v_log;

  RETURN v_log;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reconciliar_ferias_folha_batch() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.reconciliar_ferias_folha_batch() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ferias_reconciliar_folha_daily') THEN
      PERFORM cron.unschedule('ferias_reconciliar_folha_daily');
    END IF;
    PERFORM cron.schedule(
      'ferias_reconciliar_folha_daily',
      '15 6 * * *',
      $CRON$ SELECT public.reconciliar_ferias_folha_batch(); $CRON$
    );
  END IF;
END $$;