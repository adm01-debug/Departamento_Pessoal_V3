CREATE OR REPLACE FUNCTION public.trg_ciclos_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public._is_admin_bypass() THEN RETURN NEW; END IF;
  PERFORM public.validate_status_transition('ciclos_avaliacao', OLD.status, NEW.status, '{
    "rascunho": ["ativo","cancelado"],
    "ativo": ["em_andamento","cancelado","arquivado"],
    "em_andamento": ["concluido","cancelado"],
    "concluido": ["arquivado"]
  }'::jsonb);
  RETURN NEW;
END; $function$
