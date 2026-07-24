
CREATE OR REPLACE FUNCTION public.admin_list_security_definer_rpcs()
RETURNS TABLE(
  function_name text,
  arguments text,
  return_type text,
  executable_by_anon boolean,
  executable_by_authenticated boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.proname::text,
    pg_get_function_identity_arguments(p.oid)::text,
    pg_get_function_result(p.oid)::text,
    has_function_privilege('anon', p.oid, 'EXECUTE'),
    has_function_privilege('authenticated', p.oid, 'EXECUTE')
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
  ORDER BY p.proname;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_security_definer_rpcs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_security_definer_rpcs() TO authenticated;
