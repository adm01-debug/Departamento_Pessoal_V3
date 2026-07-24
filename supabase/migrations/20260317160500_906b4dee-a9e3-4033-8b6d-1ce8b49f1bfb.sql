
-- C6: Fix remaining permissive RLS policies

-- audit_logs: restrict ALL to just INSERT for authenticated (logging only)
DROP POLICY IF EXISTS "Auth users read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- bitrix24_config: restrict to empresa-scoped users
DROP POLICY IF EXISTS "Usuários autenticados podem inserir config bitrix24" ON public.bitrix24_config;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar config bitrix24" ON public.bitrix24_config;
DROP POLICY IF EXISTS "bitrix24_config_insert" ON public.bitrix24_config;
CREATE POLICY "bitrix24_config_insert" ON public.bitrix24_config FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "bitrix24_config_update" ON public.bitrix24_config;
CREATE POLICY "bitrix24_config_update" ON public.bitrix24_config FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

-- bitrix24_sync_logs: logging table, restrict to authenticated
DROP POLICY IF EXISTS "Usuários autenticados podem inserir logs bitrix24" ON public.bitrix24_sync_logs;
DROP POLICY IF EXISTS "bitrix24_sync_logs_insert" ON public.bitrix24_sync_logs;
CREATE POLICY "bitrix24_sync_logs_insert" ON public.bitrix24_sync_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- auditoria_logs: logging table
DROP POLICY IF EXISTS "Usuários autenticados podem inserir auditoria_logs" ON public.auditoria_logs;
DROP POLICY IF EXISTS "auditoria_logs_insert" ON public.auditoria_logs;
CREATE POLICY "auditoria_logs_insert" ON public.auditoria_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Fix check_brute_force search_path (M7 remaining)
CREATE OR REPLACE FUNCTION public.check_brute_force(check_email text, check_ip text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  failed_count INTEGER;
  policy_record RECORD;
BEGIN
  SELECT * INTO policy_record FROM public.password_policies LIMIT 1;
  IF NOT FOUND THEN
    policy_record.lockout_attempts := 5;
    policy_record.lockout_duration_minutes := 30;
  END IF;
  SELECT COUNT(*) INTO failed_count
  FROM public.login_attempts
  WHERE (email = check_email OR ip_address = check_ip)
  AND success = false
  AND created_at > now() - (policy_record.lockout_duration_minutes || ' minutes')::INTERVAL;
  IF failed_count >= policy_record.lockout_attempts THEN
    INSERT INTO public.security_alerts (type, severity, ip_address, details)
    VALUES ('brute_force', 'critical', check_ip, jsonb_build_object('email', check_email, 'attempts', failed_count));
    RETURN jsonb_build_object('locked', true, 'attempts', failed_count, 'lockout_minutes', policy_record.lockout_duration_minutes);
  END IF;
  RETURN jsonb_build_object('locked', false, 'attempts', failed_count, 'remaining', policy_record.lockout_attempts - failed_count);
END;
$$;

-- Fix reset_login_attempts search_path
CREATE OR REPLACE FUNCTION public.reset_login_attempts(p_identifier text, p_identifier_type text DEFAULT 'email'::text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.login_rate_limits WHERE identifier = p_identifier AND identifier_type = p_identifier_type;
END;
$$;
