CREATE OR REPLACE FUNCTION public.dp_create_next_partition()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  v_next DATE:=date_trunc('month',NOW()+INTERVAL '2 months');
  v_after DATE:=date_trunc('month',NOW()+INTERVAL '3 months');
  v_name TEXT:='dp_audit_log_'||to_char(v_next,'YYYY_MM');
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE relname=v_name) THEN
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.dp_audit_log FOR VALUES FROM (''%s'') TO (''%s'')',v_name,v_next,v_after);
  END IF;
END;
$function$
