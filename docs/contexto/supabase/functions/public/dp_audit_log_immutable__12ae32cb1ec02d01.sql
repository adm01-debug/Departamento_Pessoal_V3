CREATE OR REPLACE FUNCTION public.dp_audit_log_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 
      'dp_audit_log IMUTAVEL: UPDATE proibido em registros de auditoria. '
      'Retencao via pg_cron. Para emergencia: DROP TRIGGER e registrar incidente.'
      USING ERRCODE = '55000';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 
      'dp_audit_log IMUTAVEL: DELETE proibido. Use dp_run_retention() para expurgo controlado.'
      USING ERRCODE = '55000';
  END IF;
  RETURN NULL;
END;
$function$
