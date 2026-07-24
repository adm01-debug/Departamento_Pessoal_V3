
CREATE OR REPLACE FUNCTION public.contrato_verificar_autenticidade(p_hash text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_row record;
BEGIN
  IF p_hash IS NULL OR length(p_hash) < 32 THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Hash inválido');
  END IF;
  v_hash := lower(trim(p_hash));

  SELECT
    cg.id,
    cg.status,
    cg.assinado_em,
    cg.sha256 AS documento_hash,
    cg.data_inicio,
    cg.data_fim,
    e.razao_social AS empresa_nome,
    c.nome_completo AS colaborador_nome,
    c.cpf AS colaborador_cpf,
    t.assinatura_hash
  INTO v_row
  FROM public.contratos_gerados cg
  LEFT JOIN public.contrato_assinatura_tokens t ON t.contrato_id = cg.id AND t.usado_em IS NOT NULL
  LEFT JOIN public.empresas e ON e.id = cg.empresa_id
  LEFT JOIN public.colaboradores c ON c.id = cg.colaborador_id
  WHERE lower(cg.sha256) = v_hash
     OR lower(t.assinatura_hash) = v_hash
  ORDER BY cg.assinado_em DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Contrato não encontrado');
  END IF;

  RETURN jsonb_build_object(
    'valido', v_row.status = 'assinado' AND v_row.assinado_em IS NOT NULL,
    'status', v_row.status,
    'assinado_em', v_row.assinado_em,
    'documento_hash', v_row.documento_hash,
    'assinatura_hash', v_row.assinatura_hash,
    'empresa', v_row.empresa_nome,
    'data_inicio', v_row.data_inicio,
    'data_fim', v_row.data_fim,
    'signatario_nome', CASE
      WHEN v_row.colaborador_nome IS NULL THEN NULL
      ELSE regexp_replace(
        v_row.colaborador_nome,
        '(\S+)(\s+\S)?.*',
        '\1\2***'
      )
    END,
    'signatario_cpf_mascarado', CASE
      WHEN v_row.colaborador_cpf IS NULL THEN NULL
      ELSE '***.' || substr(regexp_replace(v_row.colaborador_cpf, '\D', '', 'g'), 4, 3)
           || '.' || substr(regexp_replace(v_row.colaborador_cpf, '\D', '', 'g'), 7, 3) || '-**'
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.contrato_verificar_autenticidade(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contrato_verificar_autenticidade(text) TO anon, authenticated;
