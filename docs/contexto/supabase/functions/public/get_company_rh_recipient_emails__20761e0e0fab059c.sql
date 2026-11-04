CREATE OR REPLACE FUNCTION public.get_company_rh_recipient_emails(p_empresa_id uuid, p_limit integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, email text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF p_empresa_id IS NULL OR p_limit IS NULL OR p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'invalid notification recipient arguments'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT DISTINCT u.id, u.email::text
  FROM auth.users AS u
  JOIN public.user_empresas AS ue ON ue.user_id = u.id
  JOIN public.user_roles AS ur ON ur.user_id = u.id
  WHERE ue.empresa_id = p_empresa_id
    AND ur.role IN ('admin'::public.app_role, 'rh'::public.app_role)
    AND u.email IS NOT NULL
    AND btrim(u.email) <> ''
  ORDER BY u.email::text, u.id
  LIMIT p_limit;
END
$function$
