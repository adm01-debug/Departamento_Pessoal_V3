CREATE OR REPLACE FUNCTION public.trg_periodos_aquisitivos_dobra()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.data_limite_concessao := NEW.data_fim + INTERVAL '12 months';
  IF CURRENT_DATE > NEW.data_limite_concessao AND COALESCE(NEW.perdeu_direito,false) = false THEN
    NEW.em_dobra := true;
  ELSE
    NEW.em_dobra := false;
  END IF;
  RETURN NEW;
END;
$function$
