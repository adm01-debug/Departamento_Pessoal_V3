
CREATE OR REPLACE FUNCTION public.contrato_preview_url_por_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_hash text;
  v_tok record;
  v_contrato record;
  v_signed jsonb;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RAISE EXCEPTION 'Token inválido';
  END IF;
  v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_tok
  FROM public.contrato_assinatura_tokens
  WHERE token_hash = v_token_hash
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token não encontrado ou inválido';
  END IF;
  IF v_tok.revogado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Token revogado';
  END IF;
  IF v_tok.usado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Contrato já assinado';
  END IF;
  IF v_tok.expira_em < now() THEN
    RAISE EXCEPTION 'Token expirado';
  END IF;

  SELECT id, storage_path INTO v_contrato
  FROM public.contratos_gerados
  WHERE id = v_tok.contrato_id
  LIMIT 1;

  IF NOT FOUND OR v_contrato.storage_path IS NULL THEN
    RAISE EXCEPTION 'Documento indisponível';
  END IF;

  -- Cria signed URL de 10 minutos via storage API
  SELECT jsonb_build_object(
    'signedURL', (storage.create_signed_url('contratos-trabalho', v_contrato.storage_path, 600))
  ) INTO v_signed;

  RETURN jsonb_build_object(
    'path', v_contrato.storage_path,
    'signed_url', v_signed->>'signedURL',
    'expira_em', (now() + interval '10 minutes')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.contrato_preview_url_por_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contrato_preview_url_por_token(text) TO anon, authenticated;
