-- =============================================================================
-- Bloqueio de conta por força bruta — RPCs ausentes
-- =============================================================================
-- supabase/functions/auth-login/index.ts chamava `check_account_lockout` e
-- `record_login_attempt`, que NUNCA existiram. Consequências reais:
--   * check_account_lockout: erro capturado em `lockoutErr` -> a verificação era
--     silenciosamente PULADA (fail-open). Nenhuma conta era bloqueada.
--   * record_login_attempt: nenhuma tentativa era persistida, então mesmo com a
--     verificação funcionando o contador jamais subiria.
-- As tabelas login_attempts / login_lockouts e calculate_lockout_duration()
-- já existiam — faltava apenas a camada que o edge consome.

-- ---------------------------------------------------------------------------
-- 1) Consulta de bloqueio (contrato: TABLE(is_locked, locked_until))
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_account_lockout(p_email text)
RETURNS TABLE(is_locked boolean, locked_until timestamptz)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
  v_row   public.login_lockouts%ROWTYPE;
BEGIN
  IF v_email = '' THEN
    RETURN QUERY SELECT false, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT * INTO v_row
    FROM public.login_lockouts
   WHERE identifier = v_email AND identifier_type = 'email';

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::timestamptz;
    RETURN;
  END IF;

  -- Bloqueio ativo
  IF v_row.is_locked AND v_row.lockout_until IS NOT NULL AND v_row.lockout_until > now() THEN
    RETURN QUERY SELECT true, v_row.lockout_until;
    RETURN;
  END IF;

  -- Bloqueio expirado: libera e zera o contador (auto-heal).
  IF v_row.is_locked THEN
    UPDATE public.login_lockouts
       SET is_locked = false, lockout_until = NULL, attempts = 0, updated_at = now()
     WHERE id = v_row.id;
  END IF;

  RETURN QUERY SELECT false, NULL::timestamptz;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Registro de tentativa + escalonamento do bloqueio
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email   text,
  p_success boolean,
  p_ip      text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email    text    := lower(trim(coalesce(p_email, '')));
  v_ip       text    := coalesce(nullif(trim(coalesce(p_ip, '')), ''), 'unknown');
  v_attempts integer;
  v_window   interval := interval '15 minutes';
  v_max      integer  := 5;
BEGIN
  IF v_email = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.login_attempts (email, ip_address, success, failure_reason)
  VALUES (v_email, v_ip, coalesce(p_success, false),
          CASE WHEN coalesce(p_success, false) THEN NULL ELSE 'invalid_credentials' END);

  -- Sucesso: zera qualquer contador pendente.
  IF coalesce(p_success, false) THEN
    UPDATE public.login_lockouts
       SET attempts = 0, is_locked = false, lockout_until = NULL,
           last_attempt = now(), updated_at = now()
     WHERE identifier = v_email AND identifier_type = 'email';
    RETURN;
  END IF;

  -- Falha: upsert do contador. Serializa contra corridas na mesma conta.
  PERFORM pg_advisory_xact_lock(hashtext('login_lockout:' || v_email));

  INSERT INTO public.login_lockouts (identifier, identifier_type, attempts, last_attempt)
  VALUES (v_email, 'email', 1, now())
  ON CONFLICT (identifier, identifier_type) DO UPDATE
    SET attempts = CASE
                     -- Falhas antigas (fora da janela) reiniciam a contagem.
                     WHEN public.login_lockouts.last_attempt < now() - v_window THEN 1
                     ELSE public.login_lockouts.attempts + 1
                   END,
        last_attempt = now(),
        updated_at   = now()
  RETURNING attempts INTO v_attempts;

  IF v_attempts IS NULL THEN
    SELECT attempts INTO v_attempts
      FROM public.login_lockouts
     WHERE identifier = v_email AND identifier_type = 'email';
  END IF;

  IF v_attempts >= v_max THEN
    UPDATE public.login_lockouts
       SET is_locked     = true,
           lockout_until = now() + public.calculate_lockout_duration(v_attempts),
           updated_at    = now()
     WHERE identifier = v_email AND identifier_type = 'email';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_account_lockout(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_account_lockout(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_account_lockout(text) TO service_role;

REVOKE ALL ON FUNCTION public.record_login_attempt(text, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_login_attempt(text, boolean, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean, text) TO service_role;

COMMENT ON FUNCTION public.check_account_lockout(text) IS
  'Retorna o estado de bloqueio de uma conta. Consumida por auth-login (service_role).';
COMMENT ON FUNCTION public.record_login_attempt(text, boolean, text) IS
  'Registra tentativa de login e escalona o bloqueio após 5 falhas em 15 min.';