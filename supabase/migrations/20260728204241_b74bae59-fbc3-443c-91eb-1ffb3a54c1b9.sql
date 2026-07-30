-- ============================================================
-- ETAPA 5: helper unico de tenant + auditoria continua de policies
-- ============================================================

CREATE OR REPLACE FUNCTION public.pertence_a_empresa(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _empresa_id IS NOT NULL
     AND _empresa_id IN (SELECT public.get_user_empresas(auth.uid()));
$$;

REVOKE ALL ON FUNCTION public.pertence_a_empresa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pertence_a_empresa(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.pertence_a_empresa(uuid) IS
  'Predicado canonico de isolamento multi-tenant. Use em RLS: USING (public.pertence_a_empresa(empresa_id))';

-- Auditoria continua: lista policies potencialmente inseguras
CREATE OR REPLACE FUNCTION public.sec_audit_policies()
RETURNS TABLE (
  tabela text,
  policy_name text,
  cmd text,
  motivo text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.sec_audit_policies() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sec_audit_policies() TO authenticated, service_role;
