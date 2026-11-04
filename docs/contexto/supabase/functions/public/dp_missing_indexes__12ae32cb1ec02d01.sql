CREATE OR REPLACE FUNCTION public.dp_missing_indexes()
 RETURNS TABLE(table_name text, seq_scans bigint, seq_tup_read bigint, idx_scans bigint, suggestion text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
SELECT 
  relname::TEXT,
  seq_scan,
  seq_tup_read,
  idx_scan,
  'Considerar index em ' || relname || ': seq_scans=' || seq_scan || 
    ', seq_tup_read=' || seq_tup_read AS suggestion
FROM pg_stat_user_tables
WHERE seq_scan > 100
  AND n_live_tup > 10000
  AND (seq_scan > idx_scan OR idx_scan IS NULL)
ORDER BY seq_tup_read DESC
LIMIT 10;
$function$
