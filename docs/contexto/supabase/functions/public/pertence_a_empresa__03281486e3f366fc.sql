CREATE OR REPLACE FUNCTION public.pertence_a_empresa(_empresa_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT _empresa_id IS NOT NULL
     AND _empresa_id IN (SELECT public.get_user_empresas(auth.uid()));
$function$
