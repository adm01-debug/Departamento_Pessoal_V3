CREATE OR REPLACE FUNCTION public.pode_finalizar_feedback(p_feedback_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select auth.uid() is not null
     and (
       public.pode_gerir_avaliacoes()
       or exists (
         select 1
           from public.feedbacks_360 f
           join public.colaboradores c on c.id = f.avaliador_id
          where f.id = p_feedback_id
            and c.user_id = auth.uid()
            and f.empresa_id in (select public.get_user_empresas(auth.uid()))
       )
       or exists (
         select 1
           from public.feedbacks_360 f
          where f.id = p_feedback_id
            and f.empresa_id in (select public.get_user_empresas(auth.uid()))
            and public.pode_aprovar_colaborador(f.avaliado_id)
       )
     )
$function$
