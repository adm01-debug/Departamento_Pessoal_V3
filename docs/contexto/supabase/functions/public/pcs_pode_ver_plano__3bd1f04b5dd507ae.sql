CREATE OR REPLACE FUNCTION public.pcs_pode_ver_plano(_plano_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.pcs_planos p
    WHERE p.id = _plano_id
      AND p.deleted_at IS NULL
      AND (
        public.is_admin(auth.uid())
        OR p.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
      )
  )
$function$
