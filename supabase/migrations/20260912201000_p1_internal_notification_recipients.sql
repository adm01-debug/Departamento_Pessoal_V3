-- P1: resolve internal e-mail recipients from auth.users without exposing the
-- auth schema (or inventing the nonexistent public.profiles.email column).

DO $preflight$
BEGIN
  IF to_regclass('auth.users') IS NULL
     OR to_regclass('public.user_empresas') IS NULL
     OR to_regclass('public.user_roles') IS NULL
     OR to_regtype('public.app_role') IS NULL THEN
    RAISE EXCEPTION 'internal notification recipients require auth.users, memberships, roles and app_role';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.get_company_rh_recipient_emails(
  p_empresa_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (user_id uuid, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
  IF p_empresa_id IS NULL OR p_limit IS NULL OR p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'invalid notification recipient arguments'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT DISTINCT u.id, u.email::text
  FROM auth.users AS u
  JOIN public.user_empresas AS ue ON ue.user_id = u.id
  JOIN public.user_roles AS ur ON ur.user_id = u.id
  WHERE ue.empresa_id = p_empresa_id
    AND ur.role IN ('admin'::public.app_role, 'rh'::public.app_role)
    AND u.email IS NOT NULL
    AND btrim(u.email) <> ''
  ORDER BY u.email::text, u.id
  LIMIT p_limit;
END
$function$;

REVOKE ALL ON FUNCTION public.get_company_rh_recipient_emails(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_rh_recipient_emails(uuid, integer)
  TO service_role;

COMMENT ON FUNCTION public.get_company_rh_recipient_emails(uuid, integer) IS
  'Service-only recipient resolver for same-company RH/admin notifications; auth.users remains private.';
