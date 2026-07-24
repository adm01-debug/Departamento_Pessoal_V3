
CREATE OR REPLACE FUNCTION public.contrato_estender_expiracao(
  p_token_id uuid,
  p_dias integer DEFAULT 7
)
RETURNS TABLE(id uuid, expira_em timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_empresa uuid;
  v_role text;
  v_current timestamptz;
  v_new timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'não autenticado' USING ERRCODE = '42501';
  END IF;
  IF p_dias IS NULL OR p_dias < 1 OR p_dias > 30 THEN
    RAISE EXCEPTION 'extensão deve estar entre 1 e 30 dias' USING ERRCODE = '22023';
  END IF;

  SELECT t.empresa_id, t.expira_em
    INTO v_empresa, v_current
  FROM public.contrato_assinatura_tokens t
  WHERE t.id = p_token_id
    AND t.revogado_em IS NULL
    AND t.usado_em IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'token inexistente, revogado ou já utilizado' USING ERRCODE = '02000';
  END IF;

  SELECT ur.role::text INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = v_user
    AND ur.role::text IN ('admin','rh','super_admin')
  LIMIT 1;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'perfil sem permissão para estender token' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_empresas ue
    WHERE ue.user_id = v_user AND ue.empresa_id = v_empresa
  ) THEN
    RAISE EXCEPTION 'sem acesso à empresa do token' USING ERRCODE = '42501';
  END IF;

  v_new := GREATEST(v_current, now()) + make_interval(days => p_dias);

  UPDATE public.contrato_assinatura_tokens
     SET expira_em = v_new
   WHERE id = p_token_id
  RETURNING contrato_assinatura_tokens.id, contrato_assinatura_tokens.expira_em
  INTO id, expira_em;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.contrato_estender_expiracao(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contrato_estender_expiracao(uuid, integer) TO authenticated;
