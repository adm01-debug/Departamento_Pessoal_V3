-- H11: Update log_frontend_error to also persist 'warn' level security events.
-- Warn-level events (account lockout, login anomalies, role escalations) are
-- critical for security auditing and must not be silently dropped.

CREATE OR REPLACE FUNCTION public.log_frontend_error(
  p_nivel    text,
  p_mensagem text,
  p_contexto jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Persist warn/error/fatal; drop info to avoid flooding
  IF p_nivel NOT IN ('warn', 'error', 'fatal') THEN
    RETURN;
  END IF;

  INSERT INTO public.audit_log_unified (
    source_table,
    user_id,
    action,
    entity,
    payload,
    user_agent,
    occurred_at
  ) VALUES (
    'frontend_logs',
    auth.uid(),
    p_nivel,
    left(p_mensagem, 500),
    p_contexto,
    left((p_contexto->>'user_agent')::text, 300),
    NOW()
  );
EXCEPTION WHEN OTHERS THEN
  -- Never propagate log-insert failures to callers
  NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.log_frontend_error(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_frontend_error(text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_frontend_error(text, text, jsonb) TO anon;
