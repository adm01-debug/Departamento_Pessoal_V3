CREATE OR REPLACE FUNCTION public.contrato_gerar_token_assinatura(p_contrato_id uuid, p_email text DEFAULT NULL::text, p_cpf text DEFAULT NULL::text, p_validade_dias integer DEFAULT 7)
 RETURNS TABLE(token text, expira_em timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_empresa uuid;
  v_status text;
  v_token text;
  v_hash text;
  v_exp timestamptz;
  v_expected_cpf text;
  v_supplied_cpf text := regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g');
BEGIN
  SELECT cg.empresa_id, cg.status,
    regexp_replace(COALESCE(a.cpf, c.cpf, ''), '[^0-9]', '', 'g')
  INTO v_empresa, v_status, v_expected_cpf
  FROM public.contratos_gerados cg
  LEFT JOIN public.admissoes a ON a.id = cg.admissao_id AND a.empresa_id = cg.empresa_id
  LEFT JOIN public.colaboradores c ON c.id = cg.colaborador_id AND c.empresa_id = cg.empresa_id
  WHERE cg.id = p_contrato_id;

  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Contrato não encontrado'; END IF;
  IF length(v_expected_cpf) <> 11 THEN
    RAISE EXCEPTION 'Contrato sem CPF verificável do signatário' USING ERRCODE = '23514';
  END IF;
  IF p_cpf IS NOT NULL AND v_supplied_cpf <> v_expected_cpf THEN
    RAISE EXCEPTION 'CPF informado diverge do contrato' USING ERRCODE = '23514';
  END IF;
  IF NOT public.user_belongs_to_empresa(auth.uid(), v_empresa)
     OR NOT (public.has_role(auth.uid(),'admin'::public.app_role)
             OR public.has_role(auth.uid(),'rh'::public.app_role)) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  IF v_status = 'assinado' THEN RAISE EXCEPTION 'Contrato já assinado'; END IF;
  IF v_status = 'cancelado' THEN RAISE EXCEPTION 'Contrato cancelado'; END IF;

  v_token := replace(gen_random_uuid()::text, '-', '');
  v_hash := encode(sha256(convert_to(v_token, 'UTF8')), 'hex');
  v_exp := now() + make_interval(days => GREATEST(1, LEAST(30, p_validade_dias)));
  INSERT INTO public.contrato_assinatura_tokens(
    contrato_id, empresa_id, token_hash, cpf_esperado,
    email_destinatario, expira_em, created_by
  ) VALUES (
    p_contrato_id, v_empresa, v_hash, v_expected_cpf,
    p_email, v_exp, auth.uid()
  );
  UPDATE public.contratos_gerados SET status='enviado'
  WHERE id=p_contrato_id AND status='gerado';
  RETURN QUERY SELECT v_token, v_exp;
END
$function$
