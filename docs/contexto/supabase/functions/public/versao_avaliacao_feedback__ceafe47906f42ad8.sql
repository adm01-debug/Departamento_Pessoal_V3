CREATE OR REPLACE FUNCTION public.versao_avaliacao_feedback(p_feedback_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select f.id::text
       || '|' || f.revisao::text
       || '|' || to_char(f.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US')
       || '|' || coalesce(f.potencial::text, '')
       || '|' || coalesce(lower(btrim(f.status)), '')
  from public.feedbacks_360 f
  where f.id = p_feedback_id;
$function$
