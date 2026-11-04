CREATE OR REPLACE FUNCTION public.reconciliar_ferias_folha_batch()
 RETURNS SETOF ferias_reconciliacao_logs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_started    timestamptz;
  v_verificadas int;
  v_corrigidas  int;
  v_restantes   int;
  v_emp record;
  v_row record;
  v_log public.ferias_reconciliacao_logs;
BEGIN
  FOR v_emp IN
    SELECT DISTINCT c.empresa_id
    FROM public.v_ferias_folha_reconciliacao v
    JOIN public.colaboradores c ON c.id = v.colaborador_id
    WHERE v.situacao = 'divergente' AND c.empresa_id IS NOT NULL
  LOOP
    v_started := clock_timestamp();
    v_verificadas := 0;
    v_corrigidas  := 0;

    FOR v_row IN
      SELECT v.ferias_id
      FROM public.v_ferias_folha_reconciliacao v
      JOIN public.colaboradores c ON c.id = v.colaborador_id
      WHERE v.situacao = 'divergente' AND c.empresa_id = v_emp.empresa_id
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
    FROM public.v_ferias_folha_reconciliacao v
    JOIN public.colaboradores c ON c.id = v.colaborador_id
    WHERE v.situacao = 'divergente' AND c.empresa_id = v_emp.empresa_id;

    INSERT INTO public.ferias_reconciliacao_logs (
      empresa_id, verificadas, corrigidas, restantes, duracao_ms
    ) VALUES (
      v_emp.empresa_id, v_verificadas, v_corrigidas, v_restantes,
      (EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000)::int
    ) RETURNING * INTO v_log;

    RETURN NEXT v_log;
  END LOOP;

  RETURN;
END;
$function$
