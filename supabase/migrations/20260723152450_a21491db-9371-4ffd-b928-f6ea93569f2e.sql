
-- Table was never created in any migration; both v1 (identificador/acao) and
-- v2 (identifier/rpc_name/success) functions reference it.
CREATE TABLE IF NOT EXISTS public.ciencia_rate_limits (
  id            BIGSERIAL PRIMARY KEY,
  identificador TEXT,                         -- v1 function column name
  identifier    TEXT,                         -- v2 function column name
  acao          TEXT,                         -- v1 function
  rpc_name      TEXT,                         -- v2 function
  ip_address    INET,
  success       BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.contrato_verificar_autenticidade_v2(
  p_hash text,
  p_ip text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_row record;
  v_ip text;
  v_count integer;
BEGIN
  IF p_hash IS NULL OR length(p_hash) < 32 THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Hash inválido');
  END IF;

  v_ip := COALESCE(p_ip, 'unknown');

  -- Rate limit: 20 consultas por 10 minutos por IP
  SELECT COUNT(*) INTO v_count
  FROM public.ciencia_rate_limits
  WHERE identificador = 'verif_contrato:' || v_ip
    AND created_at > now() - interval '10 minutes';

  IF v_count >= 20 THEN
    RETURN jsonb_build_object(
      'valido', false,
      'motivo', 'Muitas tentativas. Aguarde 10 minutos e tente novamente.'
    );
  END IF;

  INSERT INTO public.ciencia_rate_limits (identificador, acao, ip_address)
  VALUES ('verif_contrato:' || v_ip, 'verificar_contrato', v_ip);

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
      ELSE regexp_replace(v_row.colaborador_nome, '(\S+)(\s+\S)?.*', '\1\2***')
    END,
    'signatario_cpf_mascarado', CASE
      WHEN v_row.colaborador_cpf IS NULL THEN NULL
      ELSE '***.' || substr(regexp_replace(v_row.colaborador_cpf, '\D', '', 'g'), 4, 3)
           || '.' || substr(regexp_replace(v_row.colaborador_cpf, '\D', '', 'g'), 7, 3) || '-**'
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.contrato_verificar_autenticidade_v2(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contrato_verificar_autenticidade_v2(text, text) TO anon, authenticated;
