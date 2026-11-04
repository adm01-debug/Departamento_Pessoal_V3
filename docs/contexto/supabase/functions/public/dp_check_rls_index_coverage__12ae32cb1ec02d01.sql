CREATE OR REPLACE FUNCTION public.dp_check_rls_index_coverage()
 RETURNS TABLE(table_name text, policy_name text, policy_qual text, has_index boolean, recommendation text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
  SELECT 
    p.tablename::TEXT,
    p.policyname::TEXT,
    COALESCE(p.qual, p.with_check)::TEXT as policy_qual,
    EXISTS (
      SELECT 1 FROM pg_indexes i 
      WHERE i.tablename = p.tablename
    ) AS has_index,
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM pg_indexes i WHERE i.tablename=p.tablename)
      THEN 'CRIAR INDEX em ' || p.tablename || ' para suportar a policy RLS'
      ELSE 'OK'
    END AS recommendation
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.tablename LIKE 'dp_%'
  ORDER BY p.tablename, p.policyname;
$function$
