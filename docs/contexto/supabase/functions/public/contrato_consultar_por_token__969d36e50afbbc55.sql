CREATE OR REPLACE FUNCTION public.contrato_consultar_por_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  v_hash TEXT;
  v_tok RECORD;
  v_c RECORD;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN RAISE EXCEPTION 'Token inválido'; END IF;
  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  SELECT * INTO v_tok FROM public.contrato_assinatura_tokens WHERE token_hash = v_hash;
  IF v_tok IS NULL THEN RAISE EXCEPTION 'Token não encontrado'; END IF;
  IF v_tok.usado_em IS NOT NULL THEN RAISE EXCEPTION 'Token já utilizado'; END IF;
  IF v_tok.expira_em < now() THEN RAISE EXCEPTION 'Token expirado'; END IF;
  IF v_tok.tentativas > 20 THEN RAISE EXCEPTION 'Muitas tentativas'; END IF;

  UPDATE public.contrato_assinatura_tokens SET tentativas = tentativas + 1 WHERE id = v_tok.id;

  SELECT id, empresa_id, status, sha256, storage_path, data_inicio, data_fim, template_id
    INTO v_c FROM public.contratos_gerados WHERE id = v_tok.contrato_id;

  RETURN jsonb_build_object(
    'contrato_id', v_c.id,
    'status', v_c.status,
    'sha256', v_c.sha256,
    'data_inicio', v_c.data_inicio,
    'data_fim', v_c.data_fim,
    'requer_cpf', (v_tok.cpf_esperado IS NOT NULL),
    'expira_em', v_tok.expira_em
  );
END;
$function$
