CREATE OR REPLACE FUNCTION public.contrato_assinar_por_token(p_token text, p_cpf text, p_nome_completo text, p_ip inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_hash TEXT;
  v_tok RECORD;
  v_assinatura_hash TEXT;
  v_cpf_limpo TEXT;
  v_ip INET;
  v_xff TEXT;
  v_jwt_role TEXT;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN RAISE EXCEPTION 'Token inválido'; END IF;
  IF p_nome_completo IS NULL OR length(trim(p_nome_completo)) < 5 THEN
    RAISE EXCEPTION 'Nome completo obrigatório';
  END IF;

  v_cpf_limpo := regexp_replace(COALESCE(p_cpf,''), '\D', '', 'g');
  IF length(v_cpf_limpo) <> 11 THEN RAISE EXCEPTION 'CPF inválido'; END IF;

  -- IP confiável: p_ip só é honrado para service_role; demais callers usam o
  -- rightmost XFF do gateway (elemento que o gateway anexa — não forjável).
  BEGIN
    v_jwt_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;
  IF current_user = 'service_role' OR v_jwt_role = 'service_role' THEN
    v_ip := p_ip;
  ELSE
    BEGIN
      v_xff := current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for';
    EXCEPTION WHEN OTHERS THEN
      v_xff := NULL;
    END;
    BEGIN
      v_ip := NULLIF(btrim(split_part(v_xff, ',', -1)), '')::inet;
    EXCEPTION WHEN OTHERS THEN
      v_ip := NULL;
    END;
  END IF;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_tok FROM public.contrato_assinatura_tokens
  WHERE token_hash = v_hash FOR UPDATE;

  IF v_tok IS NULL THEN RAISE EXCEPTION 'Token não encontrado'; END IF;
  IF v_tok.usado_em IS NOT NULL THEN RAISE EXCEPTION 'Token já utilizado'; END IF;
  IF v_tok.expira_em < now() THEN RAISE EXCEPTION 'Token expirado'; END IF;

  IF v_tok.cpf_esperado IS NOT NULL
    AND regexp_replace(v_tok.cpf_esperado, '\D', '', 'g') <> v_cpf_limpo THEN
    RAISE EXCEPTION 'CPF não confere com o destinatário';
  END IF;

  -- Hash de assinatura: contrato_sha256 + cpf + nome + timestamp + ip
  v_assinatura_hash := encode(digest(
    COALESCE((SELECT sha256 FROM public.contratos_gerados WHERE id = v_tok.contrato_id),'') ||
    v_cpf_limpo || upper(trim(p_nome_completo)) ||
    now()::text || COALESCE(v_ip::text,''),
    'sha256'
  ), 'hex');

  UPDATE public.contrato_assinatura_tokens
  SET usado_em = now(),
      assinado_ip = v_ip,
      assinado_ua = p_user_agent,
      assinatura_hash = v_assinatura_hash
  WHERE id = v_tok.id;

  UPDATE public.contratos_gerados
  SET status = 'assinado',
      assinado_em = now(),
      assinatura_metadata = jsonb_build_object(
        'cpf', v_cpf_limpo,
        'nome', upper(trim(p_nome_completo)),
        'ip', v_ip::text,
        'user_agent', p_user_agent,
        'assinatura_hash', v_assinatura_hash,
        'assinado_em', now()
      )
  WHERE id = v_tok.contrato_id;

  RETURN jsonb_build_object(
    'success', true,
    'contrato_id', v_tok.contrato_id,
    'assinatura_hash', v_assinatura_hash,
    'assinado_em', now()
  );
END;
$function$
