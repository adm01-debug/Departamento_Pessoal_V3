CREATE OR REPLACE FUNCTION public.fn_alert_pii_access_anomaly(p_horas integer DEFAULT 1)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_inserted integer;
BEGIN
  INSERT INTO public.pii_access_alerts (
    user_id, empresa_id, tabela, acao, janela, total_registros
  )
  SELECT user_id, empresa_id, tabela, acao, janela, total_registros
  FROM public.v_pii_access_suspeitos
  WHERE janela > now() - make_interval(hours => GREATEST(p_horas, 1))
  ON CONFLICT (user_id, empresa_id, tabela, acao, janela) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$function$
