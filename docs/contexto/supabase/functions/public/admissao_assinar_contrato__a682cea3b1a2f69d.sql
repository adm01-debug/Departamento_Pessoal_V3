CREATE OR REPLACE FUNCTION public.admissao_assinar_contrato(_token text, _assinatura_base64 text, _ip text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_token public.admissao_tokens;
  v_headers jsonb := '{}'::jsonb;
  v_xff text := '';
  v_ip text := 'unknown';
  v_jwt_role text := '';
BEGIN
  SELECT t.* INTO v_token
  FROM public.admissao_tokens AS t
  WHERE t.token = _token
    AND _token IS NOT NULL
    AND pg_catalog.length(_token) >= 16
    AND (t.data_expiracao IS NULL OR t.data_expiracao > pg_catalog.now())
    AND NOT COALESCE(t.contrato_assinado, false)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'token invalido, expirado ou ja utilizado' USING ERRCODE = 'P0002';
  END IF;
  IF _assinatura_base64 IS NULL OR pg_catalog.length(_assinatura_base64) < 100 THEN
    RAISE EXCEPTION 'assinatura ausente ou invalida' USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_jwt_role := COALESCE(pg_catalog.current_setting('request.jwt.claims', true)::jsonb ->> 'role', '');
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := '';
  END;

  IF current_user = 'service_role' OR v_jwt_role = 'service_role' THEN
    v_ip := pg_catalog.left(COALESCE(NULLIF(_ip, ''), 'unknown'), 64);
  ELSE
    BEGIN
      v_headers := COALESCE(NULLIF(pg_catalog.current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
    EXCEPTION WHEN invalid_text_representation THEN
      v_headers := '{}'::jsonb;
    END;
    v_xff := COALESCE(v_headers ->> 'x-forwarded-for', '');
    IF v_xff <> '' THEN
      v_ip := pg_catalog.left(pg_catalog.btrim(pg_catalog.split_part(v_xff, ',', -1)), 64);
    END IF;
    IF v_ip IS NULL OR v_ip = '' THEN
      v_ip := 'unknown';
    END IF;
  END IF;

  UPDATE public.admissao_tokens
  SET contrato_assinado = true,
      assinado_em = pg_catalog.now(),
      assinatura_base64 = _assinatura_base64,
      ip_assinatura = v_ip,
      updated_at = pg_catalog.now()
  WHERE id = v_token.id
    AND NOT COALESCE(contrato_assinado, false);
END;
$function$
