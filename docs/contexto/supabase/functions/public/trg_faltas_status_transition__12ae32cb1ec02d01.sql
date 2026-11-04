CREATE OR REPLACE FUNCTION public.trg_faltas_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public._is_admin_bypass() THEN RETURN NEW; END IF;
  PERFORM public.validate_status_transition('faltas', OLD.status, NEW.status, '{
    "pendente": ["em_analise","justificada","abonada","injustificada","rejeitada"],
    "em_analise": ["justificada","abonada","injustificada","rejeitada","pendente"]
  }'::jsonb);
  RETURN NEW;
END; $function$
