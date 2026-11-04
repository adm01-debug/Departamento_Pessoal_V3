CREATE OR REPLACE FUNCTION public.trg_vagas_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public._is_admin_bypass() THEN RETURN NEW; END IF;
  PERFORM public.validate_status_transition('vagas', OLD.status, NEW.status, '{
    "rascunho": ["aberta","cancelada"],
    "aberta": ["pausada","encerrada","preenchida","cancelada"],
    "pausada": ["aberta","encerrada","cancelada"],
    "encerrada": ["arquivada"],
    "preenchida": ["arquivada"]
  }'::jsonb);
  RETURN NEW;
END; $function$
