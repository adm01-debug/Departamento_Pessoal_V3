-- Hardening: revoke anon EXECUTE on SECURITY DEFINER functions that must not be public.
-- Keep public only for onboarding token, pre-auth login guards, and frontend error logger.

DO $$
DECLARE
  fn_signature text;
  keep_public text[] := ARRAY[
    'public.get_admissao_por_token(text)',
    'public.check_login_lock(text,text)',
    'public.record_failed_login(text,text)',
    'public.log_frontend_error(text,text,jsonb)'
  ];
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname||'.'||p.proname||'('||pg_catalog.pg_get_function_identity_arguments(p.oid)||')' AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    IF NOT (r.sig = ANY(keep_public)) THEN
      EXECUTE 'REVOKE EXECUTE ON FUNCTION '||r.sig||' FROM PUBLIC, anon';
    END IF;
  END LOOP;
END$$;

-- Fix mutable search_path on set_updated_at_sst_cat
ALTER FUNCTION public.set_updated_at_sst_cat() SET search_path = public;