CREATE OR REPLACE FUNCTION public.fwd_to_audit_unified()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_empresa uuid;
  v_user uuid;
  v_action text;
  v_entity text;
  v_entity_id text;
  v_ip inet;
  v_ua text;
  v_occurred timestamptz;
  v_payload jsonb;
  v_row jsonb := to_jsonb(NEW);
  v_raw_empresa text;
BEGIN
  v_raw_empresa := COALESCE(
    NULLIF(v_row ->> 'empresa_id', ''),
    NULLIF(v_row #>> '{dados_novos,empresa_id}', ''),
    NULLIF(v_row #>> '{dados_novos,empresaId}', ''),
    NULLIF(v_row #>> '{dados_anteriores,empresa_id}', ''),
    NULLIF(v_row #>> '{dados_anteriores,empresaId}', ''),
    NULLIF(v_row #>> '{payload,empresa_id}', ''),
    NULLIF(v_row #>> '{payload,empresaId}', ''),
    NULLIF(v_row #>> '{payload,novos,empresa_id}', ''),
    NULLIF(v_row #>> '{payload,novos,empresaId}', ''),
    NULLIF(v_row #>> '{payload,dados_novos,empresa_id}', ''),
    NULLIF(v_row #>> '{payload,dados_novos,empresaId}', '')
  );
  IF v_raw_empresa ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_empresa := v_raw_empresa::uuid;
  END IF;

  v_user := NULL;
  BEGIN v_user := (v_row ->> 'user_id')::uuid; EXCEPTION WHEN OTHERS THEN NULL; END;
  IF v_user IS NULL THEN
    BEGIN v_user := (v_row ->> 'usuario_id')::uuid; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  IF v_user IS NULL THEN
    BEGIN v_user := (v_row ->> 'created_by')::uuid; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  v_action := COALESCE(v_row ->> 'action', v_row ->> 'acao', v_row ->> 'operation',
    v_row ->> 'operacao', v_row ->> 'event_type', v_row ->> 'tipo');
  v_entity := COALESCE(v_row ->> 'entity', v_row ->> 'entidade', v_row ->> 'table_name',
    v_row ->> 'tabela', v_row ->> 'resource', v_row ->> 'recurso');
  v_entity_id := COALESCE(v_row ->> 'entity_id', v_row ->> 'record_id',
    v_row ->> 'registro_id', v_row ->> 'resource_id');

  v_ip := NULL;
  BEGIN v_ip := (v_row ->> 'ip_address')::inet; EXCEPTION WHEN OTHERS THEN NULL; END;
  IF v_ip IS NULL THEN
    BEGIN v_ip := (v_row ->> 'ip')::inet; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  v_ua := COALESCE(v_row ->> 'user_agent', v_row ->> 'useragent');

  BEGIN
    v_occurred := COALESCE(
      (v_row ->> 'created_at')::timestamptz,
      (v_row ->> 'occurred_at')::timestamptz,
      (v_row ->> 'timestamp')::timestamptz,
      (v_row ->> 'data')::timestamptz,
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    v_occurred := now();
  END;

  v_payload := v_row - 'id' - 'empresa_id' - 'user_id' - 'usuario_id' - 'created_by'
    - 'ip_address' - 'ip' - 'user_agent' - 'useragent'
    - 'created_at' - 'occurred_at' - 'timestamp';

  INSERT INTO public.audit_log_unified (
    source_table, source_id, empresa_id, user_id, action, entity, entity_id,
    payload, ip_address, user_agent, occurred_at
  ) VALUES (
    TG_TABLE_NAME, NEW.id, v_empresa, v_user, v_action, v_entity, v_entity_id,
    v_payload, v_ip, v_ua, v_occurred
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Forwarding is observability-only and must not roll back the source event.
  RETURN NEW;
END
$function$
