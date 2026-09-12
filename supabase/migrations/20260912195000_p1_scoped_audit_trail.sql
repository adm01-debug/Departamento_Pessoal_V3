-- P1: replace the unusable authenticated audit view with a tenant-scoped RPC.
-- The legacy view joins auth.users and therefore cannot safely run as an
-- invoker for ordinary users. This contract exposes no auth schema object.

DO $preflight$
BEGIN
  IF to_regclass('public.audit_log') IS NULL
     OR to_regclass('public.audit_log_unified') IS NULL
     OR to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'scoped audit trail requires public.audit_log, public.audit_log_unified and public.profiles';
  END IF;
  IF to_regprocedure('public.is_admin(uuid)') IS NULL
     OR to_regprocedure('public.pode_gerir_rh(uuid)') IS NULL
     OR to_regprocedure('public.pertence_a_empresa(uuid)') IS NULL THEN
    RAISE EXCEPTION 'scoped audit trail requires is_admin, pode_gerir_rh and pertence_a_empresa';
  END IF;
END
$preflight$;

-- The generic forwarding trigger historically looked only for a physical
-- empresa_id column. public.audit_log stores the tenant inside the JSON
-- snapshots, so its unified copy silently lost tenant scope. Normalize all
-- known payload shapes for future writes.
CREATE OR REPLACE FUNCTION public.fwd_to_audit_unified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
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
    NULLIF(v_row #>> '{dados_anteriores,empresa_id}', ''),
    NULLIF(v_row #>> '{payload,empresa_id}', ''),
    NULLIF(v_row #>> '{payload,novos,empresa_id}', ''),
    NULLIF(v_row #>> '{payload,dados_novos,empresa_id}', '')
  );
  IF v_raw_empresa ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_empresa := v_raw_empresa::uuid;
  END IF;

  BEGIN
    v_user := COALESCE(
      (v_row ->> 'user_id')::uuid,
      (v_row ->> 'usuario_id')::uuid,
      (v_row ->> 'created_by')::uuid
    );
  EXCEPTION WHEN OTHERS THEN
    v_user := NULL;
  END;

  v_action := COALESCE(v_row ->> 'action', v_row ->> 'acao', v_row ->> 'operation',
    v_row ->> 'operacao', v_row ->> 'event_type', v_row ->> 'tipo');
  v_entity := COALESCE(v_row ->> 'entity', v_row ->> 'entidade', v_row ->> 'table_name',
    v_row ->> 'tabela', v_row ->> 'resource', v_row ->> 'recurso');
  v_entity_id := COALESCE(v_row ->> 'entity_id', v_row ->> 'record_id',
    v_row ->> 'registro_id', v_row ->> 'resource_id');

  BEGIN
    v_ip := COALESCE((v_row ->> 'ip_address')::inet, (v_row ->> 'ip')::inet);
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;
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
$function$;

-- Repair already-forwarded legacy rows whose tenant was lost. Malformed or
-- absent tenant values stay NULL and therefore remain admin/service-only.
WITH tenant_source AS (
  SELECT
    a.id,
    COALESCE(
      NULLIF(to_jsonb(a) ->> 'empresa_id', ''),
      NULLIF(a.dados_novos ->> 'empresa_id', ''),
      NULLIF(a.dados_anteriores ->> 'empresa_id', '')
    ) AS raw_empresa_id
  FROM public.audit_log AS a
)
UPDATE public.audit_log_unified AS u
SET empresa_id = s.raw_empresa_id::uuid
FROM tenant_source AS s
WHERE u.source_table = 'audit_log'
  AND u.source_id = s.id
  AND u.empresa_id IS NULL
  AND s.raw_empresa_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

CREATE INDEX IF NOT EXISTS idx_audit_unified_tenant_entity_occurred
  ON public.audit_log_unified (empresa_id, entity, occurred_at DESC);

-- Canonical application audit writer. Authorship is always server-derived;
-- callers cannot forge user_id/e-mail/time. Non-admin users must provide (or
-- embed in one of the snapshots) a company they actually belong to.
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
SET search_path = pg_catalog, public, pg_temp
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
      NULLIF(p_dados_anteriores ->> 'empresa_id', '')
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
$function$;

REVOKE ALL ON FUNCTION public.registrar_auditoria(text, text, text, jsonb, jsonb, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_auditoria(text, text, text, jsonb, jsonb, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.registrar_auditoria(text, text, text, jsonb, jsonb, uuid) IS
  'Append-only audit writer with server-derived authorship, action allowlist and tenant authorization.';

-- Remove a development-only earlier signature if this migration is replayed
-- against an environment that received a pre-release draft. Keeping both
-- overloads would make calls with default arguments ambiguous in PostgREST.
DROP FUNCTION IF EXISTS public.get_audit_trail(uuid, integer, timestamptz);
DROP FUNCTION IF EXISTS public.get_audit_trail(uuid, integer, timestamptz, text, text);

CREATE OR REPLACE FUNCTION public.get_audit_trail(
  p_empresa_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_before timestamptz DEFAULT now(),
  p_tabela text DEFAULT NULL,
  p_registro_id text DEFAULT NULL,
  p_tabelas text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  tabela text,
  registro_id text,
  acao text,
  user_id uuid,
  user_email text,
  user_nome text,
  status_anterior text,
  status_novo text,
  empresa_id uuid,
  dados_anteriores jsonb,
  dados_novos jsonb,
  campos_alterados text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  actor uuid := auth.uid();
  service_request boolean := COALESCE(auth.jwt() ->> 'role', '') = 'service_role';
  actor_is_admin boolean := false;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 500 OR p_before IS NULL
     OR (p_tabela IS NOT NULL AND (
       length(p_tabela) > 128 OR p_tabela !~ '^[A-Za-z_][A-Za-z0-9_]*$'
     ))
     OR (p_tabela IS NOT NULL AND p_tabelas IS NOT NULL)
     OR (p_tabelas IS NOT NULL AND (
       cardinality(p_tabelas) < 1 OR cardinality(p_tabelas) > 20 OR EXISTS (
         SELECT 1 FROM unnest(p_tabelas) AS candidate
         WHERE candidate IS NULL OR length(candidate) > 128
           OR candidate !~ '^[A-Za-z_][A-Za-z0-9_]*$'
       )
     ))
     OR (p_registro_id IS NOT NULL AND length(p_registro_id) > 128) THEN
    RAISE EXCEPTION 'invalid audit trail arguments' USING ERRCODE = '22023';
  END IF;

  IF actor IS NOT NULL THEN
    actor_is_admin := public.is_admin(actor);
  END IF;

  IF NOT service_request AND actor IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT service_request
     AND NOT actor_is_admin
     AND (p_empresa_id IS NULL OR NOT public.pode_gerir_rh(p_empresa_id)) THEN
    RAISE EXCEPTION 'audit trail restricted to RH or administrator'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH normalized AS (
    SELECT
      a.*,
      COALESCE(
        a.payload -> 'dados_anteriores',
        a.payload -> 'anteriores',
        a.payload -> 'old_values'
      ) AS old_data,
      COALESCE(
        a.payload -> 'dados_novos',
        a.payload -> 'novos',
        a.payload -> 'new_values'
      ) AS new_data
    FROM public.audit_log_unified AS a
    WHERE a.occurred_at < p_before
      AND (p_tabela IS NULL OR a.entity = p_tabela)
      AND (p_tabelas IS NULL OR a.entity = ANY (p_tabelas))
      AND (p_registro_id IS NULL OR a.entity_id = p_registro_id)
  )
  SELECT
    n.id,
    n.occurred_at,
    n.entity,
    n.entity_id,
    n.action,
    n.user_id,
    COALESCE(n.payload ->> 'user_email', n.payload #>> '{metadata,user_email}'),
    COALESCE(p.nome, n.payload ->> 'usuario_nome'),
    n.old_data ->> 'status',
    n.new_data ->> 'status',
    n.empresa_id,
    n.old_data,
    n.new_data,
    CASE
      WHEN jsonb_typeof(n.payload -> 'campos_alterados') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(n.payload -> 'campos_alterados'))
      ELSE NULL::text[]
    END
  FROM normalized AS n
  LEFT JOIN public.profiles AS p ON p.user_id = n.user_id
  WHERE
    (p_empresa_id IS NOT NULL AND n.empresa_id = p_empresa_id)
    OR (p_empresa_id IS NULL AND (service_request OR actor_is_admin))
  ORDER BY n.occurred_at DESC, n.id DESC
  LIMIT p_limit;
END
$function$;

REVOKE ALL ON FUNCTION public.get_audit_trail(uuid, integer, timestamptz, text, text, text[])
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_audit_trail(uuid, integer, timestamptz, text, text, text[])
  TO authenticated, service_role;

DO $lock_legacy_view$
BEGIN
  IF to_regclass('public.v_audit_trail') IS NOT NULL THEN
    REVOKE SELECT ON public.v_audit_trail FROM PUBLIC, anon, authenticated;
    GRANT SELECT ON public.v_audit_trail TO service_role;
  END IF;
END
$lock_legacy_view$;

COMMENT ON FUNCTION public.get_audit_trail(uuid, integer, timestamptz, text, text, text[]) IS
  'Tenant-scoped unified audit feed for RH/admin with optional entity filters; avoids direct access to legacy audit tables.';
