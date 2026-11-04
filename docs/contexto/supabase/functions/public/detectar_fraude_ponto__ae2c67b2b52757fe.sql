CREATE OR REPLACE FUNCTION public.detectar_fraude_ponto(_batida_id uuid, _colaborador_id uuid, _lat_nova numeric, _lng_nova numeric, _time_nova timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    ultima_lat NUMERIC;
    ultima_lng NUMERIC;
    ultima_time TIMESTAMP WITH TIME ZONE;
    distancia_metros NUMERIC;
    segundos_diff NUMERIC;
    velocidade_kmh NUMERIC;
BEGIN
    SELECT bp.latitude, bp.longitude, bp.created_at
      INTO ultima_lat, ultima_lng, ultima_time
    FROM public.batidas_ponto bp
    WHERE bp.colaborador_id = _colaborador_id
      AND bp.created_at > (_time_nova - INTERVAL '12 hours')
      AND bp.id <> _batida_id
    ORDER BY bp.created_at DESC
    LIMIT 1;

    IF FOUND AND ultima_lat IS NOT NULL AND _lat_nova IS NOT NULL THEN
        distancia_metros := sqrt(pow(_lat_nova - ultima_lat, 2) + pow(_lng_nova - ultima_lng, 2)) * 111320;
        segundos_diff := EXTRACT(EPOCH FROM (_time_nova - ultima_time));

        IF segundos_diff > 0 THEN
            velocidade_kmh := (distancia_metros / segundos_diff) * 3.6;

            IF velocidade_kmh > 1000 THEN
                INSERT INTO public.security_alerts (type, severity, details, user_id)
                VALUES (
                    'PONTO_VELOCIDADE_IMPOSSIVEL',
                    'high',
                    jsonb_build_object(
                        'velocidade_kmh', velocidade_kmh,
                        'distancia_m', distancia_metros,
                        'colaborador_id', _colaborador_id
                    ),
                    NULL
                );

                UPDATE public.batidas_ponto
                   SET anomalia_detectada = true
                 WHERE id = _batida_id;
            END IF;
        END IF;
    END IF;
END;
$function$
