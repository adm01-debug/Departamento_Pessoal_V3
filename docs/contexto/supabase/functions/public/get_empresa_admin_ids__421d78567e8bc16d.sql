CREATE OR REPLACE FUNCTION public.get_empresa_admin_ids(p_empresa_id uuid)
 RETURNS TABLE(user_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT ur.user_id
  FROM public.user_empresas ue
  JOIN public.user_roles ur ON ur.user_id = ue.user_id
  WHERE ue.empresa_id = p_empresa_id
    AND ur.role IN ('admin', 'gestor', 'rh')
    AND (
      public.is_admin(auth.uid())
      OR (
        p_empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
        AND EXISTS (
          SELECT 1
          FROM public.user_roles r
          WHERE r.user_id = auth.uid()
            AND r.role IN ('admin', 'gestor', 'rh')
        )
      )
    );
$function$
