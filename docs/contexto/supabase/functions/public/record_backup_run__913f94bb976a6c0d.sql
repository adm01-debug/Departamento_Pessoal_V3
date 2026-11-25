CREATE OR REPLACE FUNCTION public.record_backup_run(p_empresa_id uuid DEFAULT NULL::uuid, p_status text DEFAULT 'success'::text, p_duration_ms integer DEFAULT NULL::integer, p_records integer DEFAULT 0, p_tables integer DEFAULT 0, p_error text DEFAULT NULL::text, p_created_by uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.backup_logs
    (empresa_id, status, started_at, finished_at, duration_ms,
     records_count, tables_count, error_message, created_by, metadata)
  VALUES
    (p_empresa_id, p_status,
     now() - (COALESCE(p_duration_ms, 0) || 'ms')::INTERVAL,
     now(),
     p_duration_ms,
     p_records, p_tables, p_error, p_created_by, p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$
