CREATE OR REPLACE FUNCTION public.pode_editar_feedback(p_feedback_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select auth.uid() is not null
     and exists (
       select 1
         from public.feedbacks_360 f
        where f.id = p_feedback_id
          and f.empresa_id in (select public.get_user_empresas(auth.uid()))
          and public.pode_editar_colaborador(f.avaliado_id)
     )
$function$
