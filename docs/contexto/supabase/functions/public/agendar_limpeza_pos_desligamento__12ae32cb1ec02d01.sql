CREATE OR REPLACE FUNCTION public.agendar_limpeza_pos_desligamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (NEW.status = 'desligado' AND (OLD.status IS DISTINCT FROM NEW.status)) THEN
        -- Agendar anonimização para daqui a 5 anos (60 meses)
        INSERT INTO public.lgpd_fila_limpeza (registro_id, tabela, data_programada)
        VALUES (NEW.id, 'colaboradores', (CURRENT_DATE + INTERVAL '60 months')::DATE);
    END IF;
    RETURN NEW;
END;
$function$
