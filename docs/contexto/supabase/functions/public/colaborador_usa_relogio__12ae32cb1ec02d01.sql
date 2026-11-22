CREATE OR REPLACE FUNCTION public.colaborador_usa_relogio()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.colaboradores c
    WHERE (c.id = auth.uid() OR c.user_id = auth.uid())
      AND public.ponto_rep_colaborador_usa_relogio(c.id)
  );
$function$
