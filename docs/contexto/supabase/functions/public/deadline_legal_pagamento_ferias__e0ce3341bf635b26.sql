CREATE OR REPLACE FUNCTION public.deadline_legal_pagamento_ferias(p_data_inicio date)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_deadline date := p_data_inicio - 2;
BEGIN
  WHILE NOT public.eh_dia_util_br(v_deadline) LOOP
    v_deadline := v_deadline - 1;
  END LOOP;
  RETURN v_deadline;
END;
$function$
