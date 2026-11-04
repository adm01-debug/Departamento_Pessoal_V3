CREATE OR REPLACE FUNCTION public.dp_has_role(p_role dp_user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.dp_user_roles
    WHERE user_id = auth.uid()
    AND role = p_role
    AND active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  )
$function$
