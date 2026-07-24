
-- Melhoria #26: Hardening RLS + RPC de resolução em security_alerts

-- 1) Substituir política INSERT permissiva por admin-only
DROP POLICY IF EXISTS "System can insert security alerts" ON public.security_alerts;
DROP POLICY IF EXISTS "Admins can insert security alerts" ON public.security_alerts;
CREATE POLICY "Admins can insert security alerts"
  ON public.security_alerts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- 2) Índice parcial para dashboard de alertas abertos
CREATE INDEX IF NOT EXISTS idx_security_alerts_open
  ON public.security_alerts (severity, created_at DESC)
  WHERE COALESCE(resolved, false) = false;

-- 3) RPC de resolução (admin-only) com auditoria
CREATE OR REPLACE FUNCTION public.resolve_security_alert(
  _alert_id uuid,
  _note text DEFAULT NULL
) RETURNS public.security_alerts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.security_alerts;
BEGIN
  IF _uid IS NULL OR NOT public.is_admin(_uid) THEN
    RAISE EXCEPTION 'Apenas administradores podem resolver alertas'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.security_alerts
  SET resolved = true,
      resolved_by = _uid,
      resolved_at = now(),
      details = COALESCE(details, '{}'::jsonb)
                || jsonb_build_object('resolution_note', _note,
                                      'resolved_by_uid', _uid)
  WHERE id = _alert_id
    AND COALESCE(resolved, false) = false
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'Alerta não encontrado ou já resolvido'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Trilha de auditoria da resolução
  INSERT INTO public.audit_log (tabela, registro_id, acao, user_id, dados_novos)
  VALUES ('security_alerts', _alert_id, 'RESOLVE_ALERT', _uid,
          jsonb_build_object('type', _row.type, 'severity', _row.severity,
                             'note', _note, 'at', now()));

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_security_alert(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_security_alert(uuid, text) TO authenticated, service_role;
