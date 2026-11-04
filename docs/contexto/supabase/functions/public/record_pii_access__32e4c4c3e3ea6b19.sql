CREATE OR REPLACE FUNCTION public.record_pii_access(p_empresa_id uuid, p_tabela text, p_acao text DEFAULT 'select'::text, p_registro_id text DEFAULT NULL::text, p_registro_count integer DEFAULT 1)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_headers jsonb := '{}'::jsonb;
  v_xff text := '';
  v_ip text := 'unknown';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF p_empresa_id IS NULL OR NOT public.user_belongs_to_empresa(v_uid, p_empresa_id) THEN
    RAISE EXCEPTION 'TENANT_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_tabela IS NULL OR p_tabela !~ '^[a-z][a-z0-9_]{0,62}$' THEN
    RAISE EXCEPTION 'INVALID_TABLE' USING ERRCODE = '22023';
  END IF;
  IF p_acao IS NULL OR p_acao NOT IN ('select', 'export', 'print', 'download') THEN
    RAISE EXCEPTION 'INVALID_ACTION' USING ERRCODE = '22023';
  END IF;
  IF p_registro_count IS NULL OR p_registro_count NOT BETWEEN 1 AND 100000 THEN
    RAISE EXCEPTION 'INVALID_COUNT' USING ERRCODE = '22023';
  END IF;
  IF p_registro_id IS NOT NULL AND length(p_registro_id) > 256 THEN
    RAISE EXCEPTION 'INVALID_RECORD_ID' USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_headers := COALESCE(NULLIF(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  EXCEPTION WHEN invalid_text_representation THEN
    v_headers := '{}'::jsonb;
  END;

  -- XFF: o último elemento é o que o gateway anexa (peer TCP real).
  -- split_part(...,1) lia o primeiro — forjável pelo cliente.
  v_xff := COALESCE(v_headers->>'x-forwarded-for', '');
  IF v_xff <> '' THEN
    v_ip := left(btrim(split_part(v_xff, ',', -1)), 64);
  END IF;
  IF v_ip IS NULL OR v_ip = '' THEN
    v_ip := 'unknown';
  END IF;

  INSERT INTO public.pii_access_logs (
    user_id, empresa_id, tabela, acao, registro_id, registro_count, ip, user_agent
  ) VALUES (
    v_uid, p_empresa_id, p_tabela, p_acao, p_registro_id, p_registro_count,
    v_ip,
    left(COALESCE(v_headers->>'user-agent', ''), 1024)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$
