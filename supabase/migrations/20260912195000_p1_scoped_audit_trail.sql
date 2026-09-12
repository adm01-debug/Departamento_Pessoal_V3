-- P1: replace the unusable authenticated audit view with a tenant-scoped RPC.
-- The legacy view joins auth.users and therefore cannot safely run as an
-- invoker for ordinary users. This contract exposes no auth schema object.

DO $preflight$
BEGIN
  IF to_regclass('public.audit_log') IS NULL
     OR to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'scoped audit trail requires public.audit_log and public.profiles';
  END IF;
  IF to_regprocedure('public.is_admin(uuid)') IS NULL
     OR to_regprocedure('public.pode_gerir_rh(uuid)') IS NULL THEN
    RAISE EXCEPTION 'scoped audit trail requires is_admin and pode_gerir_rh';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.get_audit_trail(
  p_empresa_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100,
  p_before timestamptz DEFAULT now()
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
  dados_novos jsonb
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
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 500 OR p_before IS NULL THEN
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
  WITH extracted AS (
    SELECT
      a.*,
      COALESCE(
        NULLIF(a.dados_novos ->> 'empresa_id', ''),
        NULLIF(a.dados_anteriores ->> 'empresa_id', '')
      ) AS raw_empresa_id
    FROM public.audit_log AS a
    WHERE a.created_at < p_before
  ), normalized AS (
    SELECT
      e.*,
      CASE
        WHEN e.raw_empresa_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          THEN e.raw_empresa_id::uuid
        ELSE NULL
      END AS scoped_empresa_id
    FROM extracted AS e
  )
  SELECT
    n.id,
    n.created_at,
    n.tabela,
    n.registro_id::text,
    n.acao,
    n.user_id,
    n.user_email,
    p.nome,
    n.dados_anteriores ->> 'status',
    n.dados_novos ->> 'status',
    n.scoped_empresa_id,
    n.dados_anteriores,
    n.dados_novos
  FROM normalized AS n
  LEFT JOIN public.profiles AS p ON p.user_id = n.user_id
  WHERE
    (p_empresa_id IS NOT NULL AND n.scoped_empresa_id = p_empresa_id)
    OR (p_empresa_id IS NULL AND (service_request OR actor_is_admin))
  ORDER BY n.created_at DESC, n.id DESC
  LIMIT p_limit;
END
$function$;

REVOKE ALL ON FUNCTION public.get_audit_trail(uuid, integer, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_audit_trail(uuid, integer, timestamptz)
  TO authenticated, service_role;

REVOKE SELECT ON public.v_audit_trail FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_audit_trail TO service_role;

COMMENT ON FUNCTION public.get_audit_trail(uuid, integer, timestamptz) IS
  'Tenant-scoped audit feed for RH/admin; avoids direct authenticated access to auth.users-backed v_audit_trail.';
