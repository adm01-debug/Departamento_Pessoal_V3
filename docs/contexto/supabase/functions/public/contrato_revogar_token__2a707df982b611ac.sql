CREATE OR REPLACE FUNCTION public.contrato_revogar_token(p_token_id uuid, p_motivo text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_empresa uuid;
  v_usado timestamptz;
  v_revogado timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  SELECT empresa_id, usado_em, revogado_em
    INTO v_empresa, v_usado, v_revogado
  FROM public.contrato_assinatura_tokens
  WHERE id = p_token_id;

  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'token_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.user_belongs_to_empresa(v_uid, v_empresa) THEN
    RAISE EXCEPTION 'forbidden_tenant' USING ERRCODE = '42501';
  END IF;

  IF NOT (public.has_role(v_uid, 'admin'::app_role) OR public.has_role(v_uid, 'rh'::app_role)) THEN
    RAISE EXCEPTION 'forbidden_role' USING ERRCODE = '42501';
  END IF;

  IF v_usado IS NOT NULL THEN
    RAISE EXCEPTION 'token_already_signed' USING ERRCODE = '22023';
  END IF;

  -- Idempotente: se já revogado, apenas retorna
  IF v_revogado IS NOT NULL THEN
    RETURN;
  END IF;

  UPDATE public.contrato_assinatura_tokens
  SET revogado_em = now(),
      revogado_por = v_uid,
      revogacao_motivo = NULLIF(trim(p_motivo), '')
  WHERE id = p_token_id;
END;
$function$
