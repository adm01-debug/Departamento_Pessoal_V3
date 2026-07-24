
-- Melhoria 29: Hardening de EXECUTE em SECURITY DEFINER functions
-- Estratégia: Revogar EXECUTE de PUBLIC/anon/authenticated em TODAS as funções SECURITY DEFINER
-- e conceder EXECUTE seletivo por função conforme audiência esperada.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- Funções user-facing: conceder EXECUTE seletivo (wrapped para tolerar funções ausentes em preview)
DO $$
DECLARE
  r TEXT;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated',
    'GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated',
    'GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated',
    'GRANT EXECUTE ON FUNCTION public.get_user_empresas(uuid) TO authenticated',
    'GRANT EXECUTE ON FUNCTION public.get_user_default_empresa(uuid) TO authenticated',
    'GRANT EXECUTE ON FUNCTION public.get_user_scope_empresas(uuid) TO authenticated',
    'GRANT EXECUTE ON FUNCTION public.get_colaborador_banco_horas(uuid) TO authenticated',
    'GRANT EXECUTE ON FUNCTION public.get_audit_trail_by_user(uuid, integer) TO authenticated',
    'GRANT EXECUTE ON FUNCTION public.get_audit_trail_by_entity(text, uuid, integer) TO authenticated',
    'GRANT EXECUTE ON FUNCTION public.get_query_telemetry(integer) TO authenticated',
    'GRANT EXECUTE ON FUNCTION public.get_dlq_stats() TO authenticated',
    'GRANT EXECUTE ON FUNCTION public.get_idempotency_health() TO authenticated',
    'GRANT EXECUTE ON FUNCTION public.folha_conflict_stats(integer) TO authenticated',
    'GRANT EXECUTE ON FUNCTION public.check_login_lock(text, text) TO authenticated, anon',
    'GRANT EXECUTE ON FUNCTION public.check_brute_force(text, text) TO anon, authenticated',
    'GRANT EXECUTE ON FUNCTION public.record_failed_login(text, text) TO anon, authenticated',
    'GRANT EXECUTE ON FUNCTION public.reset_login_attempts(text, text) TO authenticated',
    'GRANT EXECUTE ON FUNCTION public.is_country_allowed(text) TO anon, authenticated',
    'GRANT EXECUTE ON FUNCTION public.is_ip_blocked(text) TO anon, authenticated',
    'GRANT EXECUTE ON FUNCTION public.is_ip_whitelisted(text) TO anon, authenticated',
    'GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, uuid) TO anon, authenticated'
  ]) LOOP
    BEGIN
      EXECUTE r;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END $$;
