CREATE OR REPLACE FUNCTION public.pode_gerir_config_ponto(_empresa_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.pertence_a_empresa(_empresa_id)
     AND EXISTS (
       SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = auth.uid()
         AND ur.role::text IN ('supervisor', 'coordenador')
     );
$function$
