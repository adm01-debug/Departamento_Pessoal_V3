-- P0 — restore the database contract consumed by the auth-login Edge Function.
--
-- A missing RPC used to make the Edge function continue without account-lockout
-- protection.  These routines are intentionally service_role-only: exposing a
-- login-attempt writer to anon/authenticated would allow account-lockout DoS.

DO $$
BEGIN
  IF to_regclass('public.login_attempts') IS NULL
     OR to_regclass('public.login_lockouts') IS NULL THEN
    RAISE EXCEPTION
      'P0 auth lockout remediation requires public.login_attempts and public.login_lockouts';
  END IF;

  IF to_regprocedure('public.calculate_lockout_duration(integer)') IS NULL THEN
    RAISE EXCEPTION
      'P0 auth lockout remediation requires public.calculate_lockout_duration(integer)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.login_lockouts'::regclass
      AND contype = 'u'
      AND conname = 'login_lockouts_identifier_identifier_type_key'
  ) THEN
    RAISE EXCEPTION
      'P0 auth lockout remediation requires unique login_lockouts(identifier, identifier_type)';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.check_account_lockout(p_email text)
RETURNS TABLE(is_locked boolean, locked_until timestamptz)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_row public.login_lockouts%ROWTYPE;
BEGIN
  IF v_email = '' THEN
    RETURN QUERY SELECT false, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT * INTO v_row
  FROM public.login_lockouts
  WHERE identifier = v_email
    AND identifier_type = 'email';

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::timestamptz;
    RETURN;
  END IF;

  IF v_row.is_locked
     AND v_row.lockout_until IS NOT NULL
     AND v_row.lockout_until > now() THEN
    RETURN QUERY SELECT true, v_row.lockout_until;
    RETURN;
  END IF;

  -- Expired locks self-heal so a stale row cannot permanently lock an account.
  IF v_row.is_locked THEN
    UPDATE public.login_lockouts
    SET is_locked = false,
        lockout_until = NULL,
        attempts = 0,
        updated_at = now()
    WHERE id = v_row.id;
  END IF;

  RETURN QUERY SELECT false, NULL::timestamptz;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email text,
  p_success boolean,
  p_ip text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO pg_catalog, public, pg_temp
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_ip text := coalesce(nullif(trim(coalesce(p_ip, '')), ''), 'unknown');
  v_attempts integer;
  v_window interval := interval '15 minutes';
  v_max integer := 5;
BEGIN
  IF v_email = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.login_attempts (email, ip_address, success, failure_reason)
  VALUES (
    v_email,
    v_ip,
    coalesce(p_success, false),
    CASE WHEN coalesce(p_success, false) THEN NULL ELSE 'invalid_credentials' END
  );

  -- A real success clears the failed-attempt state for this account.
  IF coalesce(p_success, false) THEN
    UPDATE public.login_lockouts
    SET attempts = 0,
        is_locked = false,
        lockout_until = NULL,
        last_attempt = now(),
        updated_at = now()
    WHERE identifier = v_email
      AND identifier_type = 'email';
    RETURN;
  END IF;

  -- Serialize the full upsert/lock transition for each email address.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('login_lockout:' || v_email)::bigint);

  INSERT INTO public.login_lockouts (identifier, identifier_type, attempts, last_attempt)
  VALUES (v_email, 'email', 1, now())
  ON CONFLICT (identifier, identifier_type) DO UPDATE
  SET attempts = CASE
                   WHEN public.login_lockouts.last_attempt < now() - v_window THEN 1
                   ELSE public.login_lockouts.attempts + 1
                 END,
      last_attempt = now(),
      updated_at = now()
  RETURNING attempts INTO v_attempts;

  IF v_attempts >= v_max THEN
    UPDATE public.login_lockouts
    SET is_locked = true,
        lockout_until = now() + public.calculate_lockout_duration(v_attempts),
        updated_at = now()
    WHERE identifier = v_email
      AND identifier_type = 'email';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_account_lockout(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_login_attempt(text, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_account_lockout(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text) TO service_role;

COMMENT ON FUNCTION public.check_account_lockout(text) IS
  'Returns account lock state to auth-login. service_role only.';
COMMENT ON FUNCTION public.record_login_attempt(text, boolean, text) IS
  'Records a verified login result and applies progressive account lockout. service_role only.';
