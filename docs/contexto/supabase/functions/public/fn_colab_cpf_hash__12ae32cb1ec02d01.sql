CREATE OR REPLACE FUNCTION public.fn_colab_cpf_hash()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_norm TEXT;
BEGIN
  IF NEW.cpf IS NULL OR length(btrim(NEW.cpf)) = 0 THEN
    NEW.cpf_hash  := NULL;
    NEW.cpf_last4 := NULL;
    RETURN NEW;
  END IF;
  v_norm := regexp_replace(NEW.cpf, '\D', '', 'g');
  IF length(v_norm) >= 4 THEN
    NEW.cpf_last4 := right(v_norm, 4);
  ELSE
    NEW.cpf_last4 := right(v_norm, LEAST(length(v_norm), 4));
  END IF;
  NEW.cpf_hash := encode(digest(v_norm, 'sha256'), 'hex');
  RETURN NEW;
END;
$function$
