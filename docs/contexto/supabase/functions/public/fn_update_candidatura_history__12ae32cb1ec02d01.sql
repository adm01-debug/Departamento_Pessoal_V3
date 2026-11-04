CREATE OR REPLACE FUNCTION public.fn_update_candidatura_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (OLD.etapa IS DISTINCT FROM NEW.etapa) THEN
        NEW.historico_etapas = COALESCE(NEW.historico_etapas, '[]'::jsonb) || jsonb_build_object(
            'etapa_anterior', OLD.etapa,
            'etapa_nova', NEW.etapa,
            'data_mudanca', now(),
            'user_id', auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$function$
