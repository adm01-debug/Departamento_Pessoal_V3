CREATE OR REPLACE FUNCTION public.dp_require_role(p_role dp_user_role)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
BEGIN
  IF NOT public.dp_has_role(p_role) THEN
    RAISE EXCEPTION 'Acesso negado: role % necessario. User: %', p_role, auth.uid()
    USING ERRCODE = '42501';
  END IF;
END;
$function$
