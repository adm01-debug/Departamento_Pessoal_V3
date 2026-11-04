CREATE OR REPLACE FUNCTION public.get_user_scope_empresas(_user_id uuid)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  actor uuid := auth.uid();
  service_request boolean := COALESCE(auth.jwt() ->> 'role', '') = 'service_role';
BEGIN
  IF _user_id IS NULL OR (
    NOT service_request
    AND (actor IS NULL OR (actor <> _user_id AND NOT public.is_admin(actor)))
  ) THEN
    RAISE EXCEPTION 'user scope outside caller authorization' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT e.id FROM public.empresas AS e
  WHERE e.ativa IS TRUE AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'admin'
  )
  UNION
  SELECT ue.empresa_id FROM public.user_empresas AS ue WHERE ue.user_id = _user_id;
END
$function$
