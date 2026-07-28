-- ============================================================
-- ETAPA 6: gravacao/consulta de auditoria via RPC (autoria server-side)
-- ============================================================

CREATE OR REPLACE FUNCTION public.registrar_auditoria(
  p_tabela text,
  p_registro_id text,
  p_acao text,
  p_dados_anteriores jsonb DEFAULT NULL,
  p_dados_novos jsonb DEFAULT NULL,
  p_empresa_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'nao autenticado';
  END IF;

  IF p_tabela IS NULL OR length(btrim(p_tabela)) = 0 OR length(p_tabela) > 128 THEN
    RAISE EXCEPTION 'tabela invalida';
  END IF;

  IF p_acao IS NULL OR p_acao NOT IN ('INSERT','UPDATE','DELETE','VISUALIZACAO','EXPORT') THEN
    RAISE EXCEPTION 'acao invalida: %', p_acao;
  END IF;

  -- Escopo de tenant: a empresa informada precisa pertencer ao usuario.
  IF p_empresa_id IS NOT NULL AND NOT public.pertence_a_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'empresa fora do escopo do usuario';
  END IF;

  INSERT INTO public.audit_log_unified (
    source_table, empresa_id, user_id, action, entity, entity_id, payload, occurred_at
  ) VALUES (
    'app', p_empresa_id, v_uid, p_acao, p_tabela, left(coalesce(p_registro_id,''), 128),
    jsonb_build_object('anteriores', p_dados_anteriores, 'novos', p_dados_novos),
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_auditoria(text,text,text,jsonb,jsonb,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_auditoria(text,text,text,jsonb,jsonb,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.listar_auditoria(
  p_empresa_id uuid,
  p_tabela text DEFAULT NULL,
  p_acao text DEFAULT NULL,
  p_registro_id text DEFAULT NULL,
  p_data_inicio timestamptz DEFAULT NULL,
  p_data_fim timestamptz DEFAULT NULL,
  p_limite int DEFAULT 200
)
RETURNS TABLE (
  id uuid,
  tabela text,
  registro_id text,
  acao text,
  user_id uuid,
  payload jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.pertence_a_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'empresa fora do escopo do usuario';
  END IF;

  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'rh'::app_role)) THEN
    RAISE EXCEPTION 'permissao insuficiente para consultar auditoria';
  END IF;

  RETURN QUERY
  SELECT a.id, a.entity, a.entity_id, a.action, a.user_id, a.payload, a.occurred_at
  FROM public.audit_log_unified a
  WHERE a.empresa_id = p_empresa_id
    AND (p_tabela IS NULL OR a.entity = p_tabela)
    AND (p_acao IS NULL OR a.action = p_acao)
    AND (p_registro_id IS NULL OR a.entity_id = p_registro_id)
    AND (p_data_inicio IS NULL OR a.occurred_at >= p_data_inicio)
    AND (p_data_fim IS NULL OR a.occurred_at <= p_data_fim)
  ORDER BY a.occurred_at DESC
  LIMIT greatest(1, least(coalesce(p_limite, 200), 1000));
END;
$$;

REVOKE ALL ON FUNCTION public.listar_auditoria(uuid,text,text,text,timestamptz,timestamptz,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_auditoria(uuid,text,text,text,timestamptz,timestamptz,int) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_audit_unified_empresa_occurred
  ON public.audit_log_unified (empresa_id, occurred_at DESC);
