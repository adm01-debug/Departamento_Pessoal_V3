CREATE OR REPLACE FUNCTION public.sst_regimento_ass_imutavel()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'Assinaturas de regimento são imutáveis';
END;
$function$
