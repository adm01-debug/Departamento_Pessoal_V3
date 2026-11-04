CREATE OR REPLACE FUNCTION public.trg_pdis_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public._is_admin_bypass() THEN RETURN NEW; END IF;
  PERFORM public.validate_status_transition('pdis', OLD.status, NEW.status, '{
    "rascunho": ["ativo","cancelado"],
    "ativo": ["em_andamento","pausado","cancelado"],
    "em_andamento": ["pausado","concluido","cancelado","vencido"],
    "pausado": ["em_andamento","cancelado"]
  }'::jsonb);
  RETURN NEW;
END; $function$
