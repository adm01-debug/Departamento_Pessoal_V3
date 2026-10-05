-- =============================================================================
-- FIX REGRESSÃO onda 7 (PR #174, achados Devin Review 0001/0002/0004/0005)
--
-- A seção 8 de 20261005160000 reescreveu as RPCs de contrato a partir de uma
-- versão ANTIGA (20260723145602 / 20260723152556) e derrubou proteções que já
-- existiam nas versões mais novas:
--   contrato_assinar_por_token (20260912204000):
--     - check de token revogado (revogado_em)
--     - contador de tentativas (cap 20, incremento em falha E sucesso)
--     - validações duras (nome cntrl, token 512, CPF via INVALID_SIGNER json)
--     - empresa_id conferido no contrato
--     - INSERT CONTRATO_ASSINADO em audit_log_unified
--   contrato_verificar_autenticidade_v2 (20260723210000):
--     - ip_address via p_ip::inet nullable (v_ip::inet quebrava com 'unknown')
--     - CPF via public._mask_cpf()
--     - sem EXCEPTION WHEN OTHERS que engolia erros reais
--
-- Aqui redefinimos as duas = versão mais nova + derivação de IP server-side
-- (rightmost XFF; p_ip só honrado para service_role).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.contrato_assinar_por_token(
  p_token text,
  p_cpf text,
  p_nome_completo text,
  p_ip inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_token_hash text;
  cpf_normalized text := regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g');
  name_normalized text := btrim(COALESCE(p_nome_completo, ''));
  token_row public.contrato_assinatura_tokens%ROWTYPE;
  contract_row public.contratos_gerados%ROWTYPE;
  signature_hash text;
  signed_at timestamptz := clock_timestamp();
  v_ip inet;
  v_xff text;
  v_jwt_role text;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 OR length(p_token) > 512 THEN
    RAISE EXCEPTION 'Token inválido' USING ERRCODE = '22023';
  END IF;
  IF length(cpf_normalized) <> 11 THEN
    RAISE EXCEPTION 'CPF inválido' USING ERRCODE = '22023';
  END IF;
  IF length(name_normalized) < 5 OR length(name_normalized) > 200
     OR name_normalized ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Nome completo inválido' USING ERRCODE = '22023';
  END IF;

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

  v_token_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  SELECT * INTO token_row
  FROM public.contrato_assinatura_tokens AS t
  WHERE t.token_hash = v_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Token não encontrado' USING ERRCODE = 'P0002'; END IF;
  IF token_row.revogado_em IS NOT NULL THEN RAISE EXCEPTION 'Token revogado' USING ERRCODE = '22023'; END IF;
  IF token_row.usado_em IS NOT NULL THEN RAISE EXCEPTION 'Token já utilizado' USING ERRCODE = '22023'; END IF;
  IF token_row.expira_em < now() THEN RAISE EXCEPTION 'Token expirado' USING ERRCODE = '22023'; END IF;
  IF token_row.tentativas >= 20 THEN RAISE EXCEPTION 'Muitas tentativas' USING ERRCODE = '22023'; END IF;

  IF token_row.cpf_esperado IS NULL
     OR regexp_replace(token_row.cpf_esperado, '[^0-9]', '', 'g') <> cpf_normalized THEN
    UPDATE public.contrato_assinatura_tokens SET tentativas = tentativas + 1 WHERE id = token_row.id;
    -- Returning a controlled failure is intentional. Raising after the UPDATE
    -- would roll the attempt counter back with the statement, making the
    -- brute-force limit ineffective.
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_SIGNER',
      'message', 'Dados de assinatura inválidos'
    );
  END IF;

  SELECT * INTO contract_row FROM public.contratos_gerados
  WHERE id = token_row.contrato_id AND empresa_id = token_row.empresa_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrato não encontrado' USING ERRCODE = 'P0002'; END IF;

  signature_hash := encode(sha256(convert_to(
    COALESCE(contract_row.sha256, '') || cpf_normalized || upper(name_normalized) ||
    signed_at::text || COALESCE(v_ip::text, ''), 'UTF8'
  )), 'hex');

  UPDATE public.contrato_assinatura_tokens
  SET usado_em = signed_at,
      assinado_ip = v_ip,
      assinado_ua = left(p_user_agent, 1024),
      assinatura_hash = signature_hash,
      tentativas = tentativas + 1
  WHERE id = token_row.id;

  UPDATE public.contratos_gerados
  SET status = 'assinado', assinado_em = signed_at,
      assinatura_metadata = jsonb_build_object(
        'cpf', cpf_normalized, 'nome', upper(name_normalized),
        'ip', v_ip::text, 'user_agent', left(p_user_agent, 1024),
        'assinatura_hash', signature_hash, 'assinado_em', signed_at
      ),
      updated_at = now()
  WHERE id = contract_row.id;

  IF to_regclass('public.audit_log_unified') IS NOT NULL THEN
    INSERT INTO public.audit_log_unified(source_table, empresa_id, action, entity, entity_id, payload, occurred_at)
    VALUES ('contrato_assinatura_tokens', token_row.empresa_id, 'CONTRATO_ASSINADO', 'contrato', contract_row.id::text,
      jsonb_build_object('token_id', token_row.id, 'cpf_mask', left(cpf_normalized,3)||'***'||right(cpf_normalized,2)), signed_at);
  END IF;

  RETURN jsonb_build_object('success', true, 'contrato_id', contract_row.id,
    'assinatura_hash', signature_hash, 'assinado_em', signed_at);
END
$function$;

REVOKE ALL ON FUNCTION public.contrato_assinar_por_token(text,text,text,inet,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contrato_assinar_por_token(text,text,text,inet,text) TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- contrato_verificar_autenticidade_v2 — versão 20260723210000 + IP server-side:
-- p_ip fornecido pelo caller era a chave do rate limit (forjável → bypass).
-- Agora service_role honra p_ip; demais callers são limitados pelo rightmost
-- XFF. ip_address grava NULL quando não há IP (sem 'unknown'::inet).
-- ----------------------------------------------------------------------------
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
  v_ip_inet inet;
  v_xff   text;
  v_jwt_role text;
  v_count integer;
BEGIN
  IF p_hash IS NULL OR length(p_hash) < 32 THEN
    RETURN jsonb_build_object('valido', false, 'motivo', 'Hash inválido');
  END IF;

  -- Rate-limit pela fonte real da conexão: p_ip só para service_role; demais
  -- callers são limitados pelo rightmost XFF (chave não forjável).
  BEGIN
    v_jwt_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;
  IF current_user = 'service_role' OR v_jwt_role = 'service_role' THEN
    v_ip := COALESCE(p_ip, 'unknown');
    v_ip_inet := p_ip::inet;
  ELSE
    BEGIN
      v_xff := current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for';
    EXCEPTION WHEN OTHERS THEN
      v_xff := NULL;
    END;
    v_ip := COALESCE(NULLIF(btrim(split_part(v_xff, ',', -1)), ''), 'unknown');
    BEGIN
      v_ip_inet := NULLIF(v_ip, 'unknown')::inet;
    EXCEPTION WHEN OTHERS THEN
      v_ip_inet := NULL;
    END;
  END IF;

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

  INSERT INTO public.ciencia_rate_limits (identifier, rpc_name, ip_address, success)
  VALUES ('verif_contrato:' || v_ip,
          'contrato_verificar_autenticidade_v2',
          v_ip_inet,
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
