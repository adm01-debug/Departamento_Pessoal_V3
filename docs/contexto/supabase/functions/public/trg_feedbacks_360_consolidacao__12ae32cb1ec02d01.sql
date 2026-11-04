CREATE OR REPLACE FUNCTION public.trg_feedbacks_360_consolidacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.sincronizar_consolidacao_avaliacao(new.avaliado_id, new.ciclo_id, auth.uid());
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    if tg_op = 'DELETE'
       or old.avaliado_id is distinct from new.avaliado_id
       or old.ciclo_id is distinct from new.ciclo_id then
      perform public.sincronizar_consolidacao_avaliacao(old.avaliado_id, old.ciclo_id, auth.uid());
    end if;
  end if;
  return null;
end;
$function$
