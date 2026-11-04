CREATE OR REPLACE FUNCTION public.tg_feedbacks_360_revisao()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  new.revisao := coalesce(old.revisao, 0) + 1;
  return new;
end;
$function$
