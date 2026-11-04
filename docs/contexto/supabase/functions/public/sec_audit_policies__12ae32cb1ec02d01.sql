CREATE OR REPLACE FUNCTION public.sec_audit_policies()
 RETURNS TABLE(tabela text, policy_name text, cmd text, motivo text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT p.tablename::text,
         p.policyname::text,
         p.cmd::text,
         CASE
           WHEN coalesce(p.qual,'') ~* '^\s*true\s*$' THEN 'USING (true) — sem restricao'
           WHEN (coalesce(p.qual,'')||coalesce(p.with_check,'')) ~* 'IN \( SELECT [a-z_]+\.(id|empresa_id)[^)]*FROM'
            AND (coalesce(p.qual,'')||coalesce(p.with_check,'')) !~* 'WHERE'
             THEN 'subconsulta sem correlacao com o usuario'
           WHEN (coalesce(p.qual,'')||coalesce(p.with_check,'')) ~* 'auth\.role\(\)\s*=\s*''authenticated'''
             THEN 'qualquer autenticado (sem escopo de empresa)'
           WHEN coalesce(p.qual,'')||coalesce(p.with_check,'') = '' THEN 'sem predicado'
           ELSE NULL
         END
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND public.is_admin(auth.uid())
    AND CASE
          WHEN coalesce(p.qual,'') ~* '^\s*true\s*$' THEN true
          WHEN (coalesce(p.qual,'')||coalesce(p.with_check,'')) ~* 'IN \( SELECT [a-z_]+\.(id|empresa_id)[^)]*FROM'
           AND (coalesce(p.qual,'')||coalesce(p.with_check,'')) !~* 'WHERE' THEN true
          WHEN (coalesce(p.qual,'')||coalesce(p.with_check,'')) ~* 'auth\.role\(\)\s*=\s*''authenticated''' THEN true
          WHEN coalesce(p.qual,'')||coalesce(p.with_check,'') = '' THEN true
          ELSE false
        END
  ORDER BY 1, 2;
$function$
