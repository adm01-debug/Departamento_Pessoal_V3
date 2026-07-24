
-- Fix jornadas_horarios: use jornada_id -> jornadas.empresa_id chain
DROP POLICY IF EXISTS "jh_mod" ON public.jornadas_horarios;
CREATE POLICY "jh_mod" ON public.jornadas_horarios FOR ALL TO authenticated
  USING (jornada_id IN (SELECT id FROM public.jornadas WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (jornada_id IN (SELECT id FROM public.jornadas WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- configuracoes: no empresa_id, restrict to authenticated (already better than true for write)
DROP POLICY IF EXISTS "Usuários autenticados podem inserir configuracoes" ON public.configuracoes;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar configuracoes" ON public.configuracoes;
DROP POLICY IF EXISTS "configuracoes_insert" ON public.configuracoes;
CREATE POLICY "configuracoes_insert" ON public.configuracoes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "configuracoes_update" ON public.configuracoes;
CREATE POLICY "configuracoes_update" ON public.configuracoes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- config_alertas_indicadores: no empresa_id, restrict to authenticated
DROP POLICY IF EXISTS "Authenticated users can insert config_alertas" ON public.config_alertas_indicadores;
DROP POLICY IF EXISTS "Authenticated users can update config_alertas" ON public.config_alertas_indicadores;
DROP POLICY IF EXISTS "config_alertas_insert" ON public.config_alertas_indicadores;
CREATE POLICY "config_alertas_insert" ON public.config_alertas_indicadores FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "config_alertas_update" ON public.config_alertas_indicadores;
CREATE POLICY "config_alertas_update" ON public.config_alertas_indicadores FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- M7: Fix search_path on 3 DB functions
CREATE OR REPLACE FUNCTION public.calculate_lockout_duration(attempts integer)
RETURNS interval LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  RETURN LEAST(POWER(2, GREATEST(0, attempts - 5))::INTEGER * INTERVAL '1 minute', INTERVAL '60 minutes');
END;
$$;

CREATE OR REPLACE FUNCTION public.record_failed_login(p_identifier text, p_identifier_type text DEFAULT 'email'::text)
RETURNS TABLE(is_locked boolean, locked_until_ts timestamp with time zone, attempts integer, lockout_minutes integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_record login_rate_limits%ROWTYPE;
  v_lockout_duration INTERVAL;
  v_new_attempts INTEGER;
BEGIN
  INSERT INTO public.login_rate_limits (identifier, identifier_type, failed_attempts, last_attempt_at)
  VALUES (p_identifier, p_identifier_type, 1, now())
  ON CONFLICT (identifier, identifier_type)
  DO UPDATE SET
    failed_attempts = CASE 
      WHEN login_rate_limits.locked_until IS NOT NULL AND login_rate_limits.locked_until > now() 
      THEN login_rate_limits.failed_attempts + 1
      WHEN login_rate_limits.last_attempt_at < now() - INTERVAL '1 hour' THEN 1
      ELSE login_rate_limits.failed_attempts + 1
    END,
    last_attempt_at = now(), updated_at = now()
  RETURNING * INTO v_record;
  v_new_attempts := v_record.failed_attempts;
  IF v_new_attempts >= 5 THEN
    v_lockout_duration := public.calculate_lockout_duration(v_new_attempts);
    UPDATE public.login_rate_limits SET locked_until = now() + v_lockout_duration, updated_at = now() WHERE id = v_record.id RETURNING * INTO v_record;
    RETURN QUERY SELECT TRUE, v_record.locked_until, v_new_attempts, EXTRACT(EPOCH FROM v_lockout_duration)::INTEGER / 60;
  END IF;
  RETURN QUERY SELECT FALSE, NULL::TIMESTAMP WITH TIME ZONE, v_new_attempts, 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_login_lock(p_identifier text, p_identifier_type text DEFAULT 'email'::text)
RETURNS TABLE(is_locked boolean, locked_until_ts timestamp with time zone, remaining_seconds integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_record login_rate_limits%ROWTYPE;
BEGIN
  SELECT * INTO v_record FROM public.login_rate_limits WHERE identifier = p_identifier AND identifier_type = p_identifier_type;
  IF v_record IS NULL THEN RETURN QUERY SELECT FALSE, NULL::TIMESTAMP WITH TIME ZONE, 0; RETURN; END IF;
  IF v_record.locked_until IS NOT NULL AND v_record.locked_until > now() THEN
    RETURN QUERY SELECT TRUE, v_record.locked_until, GREATEST(0, EXTRACT(EPOCH FROM (v_record.locked_until - now()))::INTEGER);
  ELSE RETURN QUERY SELECT FALSE, NULL::TIMESTAMP WITH TIME ZONE, 0; END IF;
END;
$$;
