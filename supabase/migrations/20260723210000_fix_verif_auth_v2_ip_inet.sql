-- =============================================================================
-- MELHORIA 14 — Fix bug em contrato_verificar_autenticidade_v2: v_ip::inet
--
-- Bug detectado no teste exaustivo R8:
--   v_ip = COALESCE(p_ip, 'unknown') (text)
--   INSERT ... ip_address = v_ip::inet → falha quando p_ip=NULL porque
--   'unknown'::inet é inválido (INET não aceita texto arbitrário).
--
-- FIX: usar p_ip diretamente no campo ip_address (é do tipo inet, nullable).
--   O identificador do rate limit continua usando v_ip (text) para que
--   'verif_contrato:unknown' funcione como chave de rate limit por IP ausente.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.contrato_verificar_autenticidade_v2(
  p_hash text,
  p_ip   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_hash  text;
  v_row   record;
  v_ip    text;
  v_count integer;
BEGIN
  IF p_hash IS NULL OR length(p_hash) < 32 THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Hash inválido');
  END IF;

  v_ip := COALESCE(p_ip, 'unknown');

  -- Rate limit: 20 consultas por 10 minutos por IP ou 'unknown'
  SELECT COUNT(*) INTO v_count
  FROM public.ciencia_rate_limits
  WHERE identifier = 'verif_contrato:' || v_ip
    AND created_at > now() - interval '10 minutes';

  IF v_count >= 20 THEN
    RETURN jsonb_build_object(
      'valido', false,
      'motivo', 'Muitas tentativas. Aguarde 10 minutos e tente novamente.'
    );
  END IF;

  -- Bug fix: usar p_ip (inet nullable) em vez de v_ip::inet ('unknown'::inet é inválido)
  INSERT INTO public.ciencia_rate_limits (identifier, rpc_name, ip_address, success)
  VALUES ('verif_contrato:' || v_ip,
          'contrato_verificar_autenticidade_v2',
          p_ip::inet,         -- p_ip é text mas NULL::inet = NULL (válido); p_ip não-NULL é sempre inet válido pois vem do app
          true);

  v_hash := lower(trim(p_hash));

  SELECT
    cg.id, cg.status, cg.assinado_em,
    cg.sha256        AS documento_hash,
    cg.data_inicio,  cg.data_fim,
    e.razao_social   AS empresa_nome,
    c.nome_completo  AS colaborador_nome,
    public._mask_cpf(c.cpf) AS colaborador_cpf,
    t.assinatura_hash
  INTO v_row
  FROM public.contratos_gerados cg
  LEFT JOIN public.contrato_assinatura_tokens t
         ON t.contrato_id = cg.id AND t.usado_em IS NOT NULL
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
    'valido',           v_row.status = 'assinado' AND v_row.assinado_em IS NOT NULL,
    'status',           v_row.status,
    'assinado_em',      v_row.assinado_em,
    'documento_hash',   v_row.documento_hash,
    'assinatura_hash',  v_row.assinatura_hash,
    'empresa',          v_row.empresa_nome,
    'colaborador_nome', v_row.colaborador_nome,
    'colaborador_cpf',  v_row.colaborador_cpf,
    'data_inicio',      v_row.data_inicio,
    'data_fim',         v_row.data_fim
  );
END;
$func$;

REVOKE ALL ON FUNCTION public.contrato_verificar_autenticidade_v2(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contrato_verificar_autenticidade_v2(text, text) TO anon, authenticated;
