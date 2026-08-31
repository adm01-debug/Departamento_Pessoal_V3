-- PLANO_100 · E-012 · Helpers de permissões compatíveis com o banco canônico.
-- No projeto frjbfeamybqsejlvmqbl, vínculos vivem em user_empresas e os
-- papéis globais do usuário em user_roles.

DROP FUNCTION IF EXISTS public.get_my_permissions();
CREATE FUNCTION public.get_my_permissions()
RETURNS TABLE(permissao text, papel text, empresa_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT ur.role::text, ur.role::text, ue.empresa_id
  FROM public.user_empresas ue
  JOIN public.user_roles ur ON ur.user_id = ue.user_id
  WHERE ue.user_id = auth.uid()
  ORDER BY ue.empresa_id, ur.role::text;
$$;

DROP FUNCTION IF EXISTS public.get_user_tenants();
CREATE FUNCTION public.get_user_tenants()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT ue.empresa_id
  FROM public.user_empresas ue
  WHERE ue.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_permissions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_tenants() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_tenants() TO authenticated, service_role;

DO $$
DECLARE
  sig text;
BEGIN
  FOR sig IN
    SELECT format('%I.%I(%s)', n.nspname, p.proname,
                   pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_my_permissions', 'get_user_tenants')
      AND pg_get_function_identity_arguments(p.oid) <> ''
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', sig);
  END LOOP;
END $$;
