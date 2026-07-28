-- ---------------------------------------------------------------------------
-- registrar_batida_ponto (correção 3/3)
-- A coluna de metadados em public.batidas_ponto chama-se device_metadata,
-- não metadata. Conferido em information_schema.columns.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_batida_ponto(
  p_colaborador_id uuid, p_empresa_id uuid, p_data date,
  p_hora time without time zone, p_tipo text, p_origem text DEFAULT 'web'::text,
  p_latitude numeric DEFAULT NULL::numeric, p_longitude numeric DEFAULT NULL::numeric,
  p_precisao_metros integer DEFAULT NULL::integer,
  p_dispositivo_id text DEFAULT 'web-browser'::text,
  p_dentro_raio boolean DEFAULT true,
  p_timezone text DEFAULT 'America/Sao_Paulo'::text,
  p_hash_integridade text DEFAULT NULL::text,
  p_foto_biometria_url text DEFAULT NULL::text,
  p_metadata jsonb DEFAULT NULL::jsonb)
RETURNS batidas_ponto
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ordem  integer;
  v_batida public.batidas_ponto;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtext(p_colaborador_id::text || p_data::text)
  );

  SELECT COALESCE(MAX(ordem), 0) + 1
    INTO v_ordem
    FROM public.batidas_ponto
   WHERE colaborador_id = p_colaborador_id
     AND data = p_data;

  INSERT INTO public.batidas_ponto (
    colaborador_id, empresa_id, data, hora, ordem, tipo, origem,
    latitude, longitude, precisao_metros, dispositivo_id,
    dentro_raio, timezone, foto_biometria_url, device_metadata
    -- hash_integridade: omitido de propósito; o gatilho
    -- enforce_batida_ponto_hash sela a linha a partir do conteúdo gravado.
  ) VALUES (
    p_colaborador_id, p_empresa_id, p_data, p_hora, v_ordem, p_tipo, p_origem,
    p_latitude, p_longitude, p_precisao_metros, p_dispositivo_id,
    p_dentro_raio, p_timezone, p_foto_biometria_url,
    COALESCE(p_metadata, '{}'::jsonb)
      || jsonb_build_object('device_hash', p_hash_integridade)
  )
  RETURNING * INTO v_batida;

  RETURN v_batida;
END;
$function$;