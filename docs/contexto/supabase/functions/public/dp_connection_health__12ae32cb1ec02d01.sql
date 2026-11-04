CREATE OR REPLACE FUNCTION public.dp_connection_health()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
SELECT jsonb_build_object(
  'max_connections', current_setting('max_connections')::int,
  'active_connections', (SELECT count(*) FROM pg_stat_activity WHERE state='active'),
  'idle_connections', (SELECT count(*) FROM pg_stat_activity WHERE state='idle'),
  'total_connections', (SELECT count(*) FROM pg_stat_activity),
  'waiting_connections', (SELECT count(*) FROM pg_stat_activity WHERE wait_event IS NOT NULL),
  'db_size_mb', round((pg_database_size(current_database())::numeric / 1024 / 1024)::numeric, 2),
  'cache_hit_ratio', round((
    SELECT 100.0 * sum(blks_hit) / nullif(sum(blks_hit)+sum(blks_read),0)
    FROM pg_stat_database WHERE datname=current_database()
  )::numeric, 2),
  'checked_at', NOW()
)
$function$
