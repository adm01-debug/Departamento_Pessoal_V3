CREATE OR REPLACE FUNCTION public.registrar_auditoria(p_tabela text, p_registro_id text, p_acao text, p_dados_anteriores jsonb DEFAULT NULL::jsonb, p_dados_novos jsonb DEFAULT NULL::jsonb, p_empresa_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  actor uuid := auth.uid();
  actor_is_admin boolean := false;
  audit_id uuid;
  scoped_empresa_id uuid := p_empresa_id;
  raw_empresa_id text;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  actor_is_admin := public.is_admin(actor);

  IF p_tabela IS NULL OR length(p_tabela) > 128
     OR p_tabela !~ '^[A-Za-z_][A-Za-z0-9_]*$'
     OR p_registro_id IS NULL OR length(p_registro_id) < 1 OR length(p_registro_id) > 128 THEN
    RAISE EXCEPTION 'invalid audit entity' USING ERRCODE = '22023';
  END IF;
  IF p_acao IS NULL OR p_acao NOT IN (
    'INSERT', 'UPDATE', 'DELETE', 'VISUALIZACAO', 'EXPORT', 'EXECUTE_CALC', 'SIGN'
  ) THEN
    RAISE EXCEPTION 'invalid audit action' USING ERRCODE = '22023';
  END IF;

  IF scoped_empresa_id IS NULL THEN
    raw_empresa_id := COALESCE(
      NULLIF(p_dados_novos ->> 'empresa_id', ''),
      NULLIF(p_dados_novos ->> 'empresaId', ''),
      NULLIF(p_dados_anteriores ->> 'empresa_id', ''),
      NULLIF(p_dados_anteriores ->> 'empresaId', '')
    );
    IF raw_empresa_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      scoped_empresa_id := raw_empresa_id::uuid;
    END IF;
  END IF;

  IF scoped_empresa_id IS NULL AND NOT actor_is_admin THEN
    RAISE EXCEPTION 'empresa_id required for audit event' USING ERRCODE = '42501';
  END IF;
  IF scoped_empresa_id IS NOT NULL
     AND NOT actor_is_admin
     AND NOT public.pertence_a_empresa(scoped_empresa_id) THEN
    RAISE EXCEPTION 'company outside user scope' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.audit_log_unified (
    source_table, empresa_id, user_id, action, entity, entity_id, payload, occurred_at
  ) VALUES (
    'app', scoped_empresa_id, actor, p_acao, p_tabela, p_registro_id,
    jsonb_build_object('anteriores', p_dados_anteriores, 'novos', p_dados_novos),
    now()
  )
  RETURNING id INTO audit_id;

  RETURN audit_id;
END
$function$
