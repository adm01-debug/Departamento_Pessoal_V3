CREATE OR REPLACE FUNCTION public.fn_ponto_rep_funcionario_cpf_last4()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_norm text;
BEGIN
  IF NEW.cpf IS NULL OR length(btrim(NEW.cpf)) = 0 THEN
    NEW.cpf_last4 := NULL;
    RETURN NEW;
  END IF;
  v_norm := regexp_replace(NEW.cpf, '\D', '', 'g');
  NEW.cpf_last4 := right(v_norm, LEAST(length(v_norm), 4));
  RETURN NEW;
END;
$function$
