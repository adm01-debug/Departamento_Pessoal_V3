CREATE OR REPLACE FUNCTION public.admissao_assinar_contrato(_token text, _assinatura_base64 text, _ip text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_token public.admissao_tokens;
  v_headers jsonb := '{}'::jsonb;
  v_xff text := '';
  v_ip text := 'unknown';
  v_jwt_role text := '';
BEGIN
  v_token := public._admissao_token_row(_token);
  IF v_token IS NULL THEN
    RAISE EXCEPTION 'token invalido ou expirado' USING ERRCODE = 'P0002';
  END IF;
  IF _assinatura_base64 IS NULL OR length(_assinatura_base64) < 100 THEN
    RAISE EXCEPTION 'assinatura ausente ou invalida' USING ERRCODE = '22023';
  END IF;

  -- IP: só service_role pode informar _ip explicitamente (chamadas internas
  -- confiáveis). Para anon/authenticated o IP é derivado do último elemento
  -- de x-forwarded-for exposto pelo PostgREST — o caller não forja evidência.
  BEGIN
    v_jwt_role := COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '');
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := '';
  END;
  IF current_user = 'service_role' OR v_jwt_role = 'service_role' THEN
    v_ip := left(COALESCE(NULLIF(_ip, ''), 'unknown'), 64);
  ELSE
    BEGIN
      v_headers := COALESCE(NULLIF(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
    EXCEPTION WHEN invalid_text_representation THEN
      v_headers := '{}'::jsonb;
    END;
    v_xff := COALESCE(v_headers->>'x-forwarded-for', '');
    IF v_xff <> '' THEN
      v_ip := left(btrim(split_part(v_xff, ',', -1)), 64);
    END IF;
    IF v_ip IS NULL OR v_ip = '' THEN
      v_ip := 'unknown';
    END IF;
  END IF;

  UPDATE public.admissao_tokens
  SET contrato_assinado = true,
      assinado_em = now(),
      assinatura_base64 = _assinatura_base64,
      ip_assinatura = v_ip,
      updated_at = now()
  WHERE id = v_token.id;
END;
$function$
