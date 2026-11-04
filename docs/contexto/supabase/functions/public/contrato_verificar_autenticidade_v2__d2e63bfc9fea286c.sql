CREATE OR REPLACE FUNCTION public.contrato_verificar_autenticidade_v2(p_hash text, p_ip text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hash text;
  v_row record;
  v_ip text;
  v_xff text;
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
  ELSE
    BEGIN
      v_xff := current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for';
    EXCEPTION WHEN OTHERS THEN
      v_xff := NULL;
    END;
    v_ip := COALESCE(NULLIF(btrim(split_part(v_xff, ',', -1)), ''), 'unknown');
  END IF;

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
  VALUES ('verif_contrato:' || v_ip, 'contrato_verificar_autenticidade_v2', v_ip::inet, true);

  v_hash := lower(trim(p_hash));

  SELECT
    cg.id, cg.status, cg.assinado_em,
    cg.sha256 AS documento_hash,
    cg.data_inicio, cg.data_fim,
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
EXCEPTION WHEN OTHERS THEN
  -- Se falhar o insert do rate-limit (ex.: IP inválido), degrada com segurança
  RETURN jsonb_build_object('valido', false, 'motivo', 'Erro na verificação. Tente novamente.');
END;
$function$
