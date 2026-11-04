CREATE OR REPLACE FUNCTION public.process_lgpd_cleanup_queue()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_processed integer := 0;
BEGIN
  -- Delega para a drenagem real (que de fato anonimiza) em vez de apenas
  -- marcar linhas — o comportamento anterior perdia o dado a expurgar.
  SELECT count(*)::integer INTO v_processed
    FROM public.drenar_fila_limpeza_lgpd(500) d
   WHERE d.sucesso;
  RETURN v_processed;
END;
$function$
