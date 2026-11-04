CREATE OR REPLACE FUNCTION public.versao_consolidada_avaliacao(p_colaborador_id uuid, p_ciclo_id uuid)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with avaliacoes as (
    select md5(to_jsonb(f)::text) as parte
      from public.feedbacks_360 f
     where f.avaliado_id = p_colaborador_id
       and f.ciclo_id = p_ciclo_id
       and lower(btrim(coalesce(f.status, ''))) <> 'cancelado'
  )
  select case when count(*) = 0 then null
              else md5(string_agg(parte, ';' order by parte)) || ':' || count(*)::text
         end
    from avaliacoes;
$function$
