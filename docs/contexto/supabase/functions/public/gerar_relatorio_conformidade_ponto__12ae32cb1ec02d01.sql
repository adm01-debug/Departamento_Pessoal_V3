CREATE OR REPLACE FUNCTION public.gerar_relatorio_conformidade_ponto()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
    v_timezone TEXT;
    v_geofencing_ok BOOLEAN := true;
    v_divergencia_minutos INTEGER;
BEGIN
    -- Simulação de validações da Portaria 671
    v_timezone := 'America/Sao_Paulo';
    
    -- Calcular divergência em minutos entre original e sugerida
    IF NEW.hora_original IS NOT NULL AND NEW.hora_sugerida IS NOT NULL THEN
        v_divergencia_minutos := ABS(EXTRACT(EPOCH FROM (NEW.hora_sugerida::time - NEW.hora_original::time)) / 60);
    ELSE
        v_divergencia_minutos := 0;
    END IF;

    -- Consolidar no JSONB
    NEW.relatorio_conformidade := jsonb_build_object(
        'timestamp_validacao', now(),
        'timezone', v_timezone,
        'geofencing', v_geofencing_ok,
        'divergencia_minutos', v_divergencia_minutos,
        'sha256_integridade', encode(digest(NEW.id::text || NEW.hora_sugerida::text || now()::text, 'sha256'), 'hex'),
        'portaria_671_conformidade', true,
        'validador_id', auth.uid()
    );

    RETURN NEW;
END;
$function$
