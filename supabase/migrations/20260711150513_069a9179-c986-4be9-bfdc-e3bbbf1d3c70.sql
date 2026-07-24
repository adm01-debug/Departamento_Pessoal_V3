
-- Tabela de contadores/lockout (uma linha por identificador).
CREATE TABLE IF NOT EXISTS public.login_lockouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  identifier_type text NOT NULL DEFAULT 'email',
  attempts integer NOT NULL DEFAULT 0,
  is_locked boolean NOT NULL DEFAULT false,
  lockout_until timestamptz,
  last_attempt timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identifier, identifier_type)
);

GRANT SELECT, INSERT, UPDATE ON public.login_lockouts TO authenticated;
GRANT ALL ON public.login_lockouts TO service_role;
ALTER TABLE public.login_lockouts ENABLE ROW LEVEL SECURITY;

-- Acesso à tabela é feito exclusivamente via SECURITY DEFINER RPCs.
DROP POLICY IF EXISTS "login_lockouts_service_role_all" ON public.login_lockouts;
CREATE POLICY "login_lockouts_service_role_all"
  ON public.login_lockouts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- === RPCs ===
CREATE OR REPLACE FUNCTION public.check_login_lock(
  p_identifier text,
  p_identifier_type text DEFAULT 'email'
) RETURNS TABLE(is_locked boolean, remaining_seconds integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_locked boolean;
  v_until timestamptz;
BEGIN
  SELECT ll.is_locked, ll.lockout_until INTO v_locked, v_until
  FROM public.login_lockouts ll
  WHERE ll.identifier = lower(p_identifier)
    AND ll.identifier_type = p_identifier_type;

  IF v_locked AND v_until IS NOT NULL AND v_until > now() THEN
    RETURN QUERY SELECT true, EXTRACT(EPOCH FROM (v_until - now()))::integer;
  ELSE
    IF v_locked THEN
      UPDATE public.login_lockouts
         SET is_locked = false, lockout_until = NULL, attempts = 0, updated_at = now()
       WHERE identifier = lower(p_identifier)
         AND identifier_type = p_identifier_type;
    END IF;
    RETURN QUERY SELECT false, 0;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_failed_login(
  p_identifier text,
  p_identifier_type text DEFAULT 'email'
) RETURNS TABLE(attempts integer, is_locked boolean, lockout_minutes integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_attempts integer;
  v_locked boolean := false;
  v_lock_min integer := 0;
BEGIN
  INSERT INTO public.login_lockouts (identifier, identifier_type, attempts, last_attempt)
  VALUES (lower(p_identifier), p_identifier_type, 1, now())
  ON CONFLICT (identifier, identifier_type) DO UPDATE
    SET attempts = public.login_lockouts.attempts + 1,
        last_attempt = now(),
        updated_at = now()
  RETURNING public.login_lockouts.attempts INTO v_attempts;

  IF v_attempts >= 5 THEN
    v_locked := true;
    v_lock_min := CASE
      WHEN v_attempts >= 10 THEN 60
      WHEN v_attempts >= 7 THEN 15
      ELSE 5
    END;
    UPDATE public.login_lockouts
       SET is_locked = true,
           lockout_until = now() + make_interval(mins => v_lock_min),
           updated_at = now()
     WHERE identifier = lower(p_identifier)
       AND identifier_type = p_identifier_type;
  END IF;

  RETURN QUERY SELECT v_attempts, v_locked, v_lock_min;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_login_attempts(
  p_identifier text,
  p_identifier_type text DEFAULT 'email'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.login_lockouts
     SET attempts = 0, is_locked = false, lockout_until = NULL, updated_at = now()
   WHERE identifier = lower(p_identifier)
     AND identifier_type = p_identifier_type;
END;
$$;

-- Permissões: pré-login (anon+authenticated) para check/record; reset só autenticado.
REVOKE ALL ON FUNCTION public.check_login_lock(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_login_lock(text, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.record_failed_login(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_failed_login(text, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.reset_login_attempts(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_login_attempts(text, text) TO authenticated;
