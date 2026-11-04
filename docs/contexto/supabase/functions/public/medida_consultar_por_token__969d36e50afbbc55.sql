CREATE OR REPLACE FUNCTION public.medida_consultar_por_token(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
  v_medida_id UUID;
BEGIN
  IF NOT public.check_ciencia_rate_limit('medida_consultar_por_token', left(p_token, 8)) THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING HINT = 'Muitas tentativas. Aguarde 10 minutos.';
  END IF;

  SELECT medida_id INTO v_medida_id
  FROM public.medidas_ciencia_tokens
  WHERE token = p_token
    AND expires_at > now()
    AND used_at IS NULL;

  IF v_medida_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'token_invalid_or_expired');
  END IF;

  SELECT jsonb_build_object(
    'valid', true,
    'medida_id', md.id,
    'tipo', md.tipo,
    'motivo', md.motivo,
    'descricao', md.descricao,
    'data_ocorrencia', md.data_ocorrencia,
    'empresa_nome', e.nome_fantasia,
    'colaborador_nome', c.nome_completo
  ) INTO v_result
  FROM public.medidas_disciplinares md
  JOIN public.colaboradores c ON c.id = md.colaborador_id
  JOIN public.empresas e ON e.id = md.empresa_id
  WHERE md.id = v_medida_id;

  RETURN v_result;
END;
$function$
