CREATE OR REPLACE FUNCTION public.trg_ajuste_ponto_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public._is_admin_bypass() THEN RETURN NEW; END IF;
  PERFORM public.validate_status_transition('solicitacoes_ajuste_ponto', OLD.status, NEW.status, '{
    "pendente": ["em_analise","aprovada","rejeitada","cancelada"],
    "em_analise": ["aprovada","rejeitada","cancelada","pendente"],
    "aprovada": ["estornada"]
  }'::jsonb);
  RETURN NEW;
END; $function$
