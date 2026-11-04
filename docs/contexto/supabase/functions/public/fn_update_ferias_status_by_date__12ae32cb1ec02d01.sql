CREATE OR REPLACE FUNCTION public.fn_update_ferias_status_by_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Se aprovada e hoje está entre início e fim, marca 'em_gozo'
    IF (NEW.status = 'aprovada' AND CURRENT_DATE BETWEEN NEW.data_inicio AND NEW.data_fim) THEN
        NEW.status = 'em_gozo';
    ELSIF (NEW.status = 'em_gozo' AND CURRENT_DATE > NEW.data_fim) THEN
        NEW.status = 'concluida';
    END IF;
    RETURN NEW;
END;
$function$
