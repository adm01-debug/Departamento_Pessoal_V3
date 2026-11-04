CREATE OR REPLACE FUNCTION public.trg_pesquisas_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public._is_admin_bypass() THEN RETURN NEW; END IF;
  PERFORM public.validate_status_transition('pesquisas', OLD.status, NEW.status, '{
    "rascunho": ["ativa","cancelada"],
    "ativa": ["encerrada","cancelada"],
    "encerrada": ["arquivada"]
  }'::jsonb);
  RETURN NEW;
END; $function$
