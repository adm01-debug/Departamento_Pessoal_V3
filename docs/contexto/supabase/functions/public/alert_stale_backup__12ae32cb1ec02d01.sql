CREATE OR REPLACE FUNCTION public.alert_stale_backup()
 RETURNS TABLE(empresa_id uuid, empresa_nome text, last_backup_at timestamp with time zone, hours_since integer, records_backup integer, tables_backup integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    bl.empresa_id,
    e.nome_fantasia AS empresa_nome,
    MAX(bl.started_at)              AS last_backup_at,
    EXTRACT(EPOCH FROM (now() - MAX(bl.started_at)))::INTEGER / 3600 AS hours_since,
    MAX(bl.records_count)           AS records_backup,
    MAX(bl.tables_count)           AS tables_backup
  FROM public.backup_logs bl
  LEFT JOIN public.empresas e ON e.id = bl.empresa_id
  WHERE bl.status IN ('success', 'partial')
    AND bl.started_at < now() - INTERVAL '24 hours'
  GROUP BY bl.empresa_id, e.nome_fantasia
  ORDER BY hours_since DESC;
END;
$function$
