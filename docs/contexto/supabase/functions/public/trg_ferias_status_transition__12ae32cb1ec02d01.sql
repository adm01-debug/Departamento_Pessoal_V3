CREATE OR REPLACE FUNCTION public.trg_ferias_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public._is_admin_bypass() THEN RETURN NEW; END IF;
  PERFORM public.validate_status_transition('ferias', OLD.status, NEW.status, '{
    "solicitada": ["em_analise","pendente_aprovacao","aprovada","rejeitada","cancelada"],
    "pendente_aprovacao": ["em_analise","aprovada","rejeitada","cancelada"],
    "em_analise": ["aprovada","rejeitada","cancelada","pendente_aprovacao"],
    "aprovada": ["agendada","em_gozo","cancelada"],
    "agendada": ["em_gozo","cancelada"],
    "em_gozo": ["concluida"],
    "vencida": ["cancelada"]
  }'::jsonb);
  RETURN NEW;
END; $function$
