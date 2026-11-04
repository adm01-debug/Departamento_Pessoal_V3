CREATE OR REPLACE FUNCTION public.medida_verificar_ciencia_hash(p_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.check_ciencia_rate_limit('medida_verificar_ciencia_hash', left(p_hash, 12)) THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING HINT = 'Muitas tentativas. Aguarde 10 minutos.';
  END IF;

  SELECT jsonb_build_object(
    'valid', true,
    'medida_id', md.id,
    'tipo', md.tipo,
    'data_ocorrencia', md.data_ocorrencia,
    'empresa_nome', e.nome_fantasia,
    'acao', mct.acao,
    'data_ciencia', mct.used_at,
    'ip_mascarado', host(set_masklen(mct.ip_address::CIDR, 24))
  ) INTO v_result
  FROM public.medidas_ciencia_tokens mct
  JOIN public.medidas_disciplinares md ON md.id = mct.medida_id
  JOIN public.empresas e ON e.id = md.empresa_id
  WHERE mct.hash_comprovante = p_hash
    AND mct.used_at IS NOT NULL;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'hash_not_found');
  END IF;

  RETURN v_result;
END;
$function$
