CREATE OR REPLACE FUNCTION public.get_audit_trail(p_empresa_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 100, p_before timestamp with time zone DEFAULT now(), p_tabela text DEFAULT NULL::text, p_registro_id text DEFAULT NULL::text, p_tabelas text[] DEFAULT NULL::text[], p_before_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, created_at timestamp with time zone, tabela text, registro_id text, acao text, user_id uuid, user_email text, user_nome text, status_anterior text, status_novo text, empresa_id uuid, dados_anteriores jsonb, dados_novos jsonb, campos_alterados text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
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
    WHERE (a.occurred_at, a.id) < (
        p_before,
        COALESCE(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)
      )
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
$function$
