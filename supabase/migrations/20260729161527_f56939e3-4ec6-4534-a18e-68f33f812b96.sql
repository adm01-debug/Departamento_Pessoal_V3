-- DEFEITO: a funcao filtrava por `mct.hash_comprovante`, coluna que nao existe
-- em medidas_ciencia_tokens — ela pertence a batidas_ponto (modulo de ponto).
-- Efeito: o portal publico de verificacao de autenticidade SEMPRE falhava com
-- erro 42703, inclusive para comprovantes legitimos, e devolvia o nome da
-- coluna interna para um visitante anonimo.
-- A coluna correta nesta tabela e `assinatura_hash`.
CREATE OR REPLACE FUNCTION public.medida_verificar_ciencia_hash(p_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public.check_ciencia_rate_limit('medida_verificar_ciencia_hash', left(coalesce(p_hash,''), 12)) THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING HINT = 'Muitas tentativas. Aguarde 10 minutos.';
  END IF;

  -- Hash ausente/vazio nao deve sequer consultar: responde igual a "nao achado"
  -- para nao criar um canal de distincao entre "malformado" e "inexistente".
  IF p_hash IS NULL OR btrim(p_hash) = '' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'hash_not_found');
  END IF;

  SELECT jsonb_build_object(
    'valid', true,
    'medida_id', md.id,
    'tipo', md.tipo,
    'data_ocorrencia', md.data_ocorrencia,
    'empresa_nome', e.nome_fantasia,
    'acao', mct.acao,
    'data_ciencia', mct.used_at,
    -- ip_address e TEXT; entrada invalida nao pode derrubar a funcao.
    'ip_mascarado', CASE
        WHEN mct.ip_address IS NULL THEN NULL
        ELSE host(set_masklen((mct.ip_address)::inet::cidr, 24))
      END
  ) INTO v_result
  FROM public.medidas_ciencia_tokens mct
  JOIN public.medidas_disciplinares md ON md.id = mct.medida_id
  JOIN public.empresas e ON e.id = md.empresa_id
  WHERE mct.assinatura_hash = p_hash
    AND mct.used_at IS NOT NULL;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'hash_not_found');
  END IF;

  RETURN v_result;
END;
$function$;
