-- =============================================
-- MÓDULO DE SEGURANÇA AVANÇADA
-- =============================================

-- 1. TABELA DE RATE LIMITING
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. TABELA DE IPs BLOQUEADOS
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT,
  blocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  permanent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. TABELA DE IP WHITELIST
CREATE TABLE IF NOT EXISTS public.ip_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  description TEXT,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. TABELA DE CONFIGURAÇÕES DE RATE LIMIT
CREATE TABLE IF NOT EXISTS public.rate_limit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  max_requests INTEGER NOT NULL DEFAULT 100,
  window_seconds INTEGER NOT NULL DEFAULT 60,
  block_duration_seconds INTEGER NOT NULL DEFAULT 3600,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. TABELA DE SESSÕES DE USUÁRIO
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB,
  location JSONB,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. TABELA DE MFA (Multi-Factor Authentication)
CREATE TABLE IF NOT EXISTS public.user_mfa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret TEXT,
  mfa_type TEXT DEFAULT 'totp',
  backup_codes TEXT[],
  recovery_email TEXT,
  phone_number TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. TABELA DE TENTATIVAS DE LOGIN
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  mfa_required BOOLEAN DEFAULT false,
  mfa_passed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. TABELA DE TOKENS DE VERIFICAÇÃO
CREATE TABLE IF NOT EXISTS public.verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- 'email', 'password_reset', 'mfa_setup'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. TABELA DE ALERTAS DE SEGURANÇA
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'brute_force', 'suspicious_activity', 'rate_limit_exceeded'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  ip_address TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. TABELA DE POLÍTICAS DE SENHA
CREATE TABLE IF NOT EXISTS public.password_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_length INTEGER DEFAULT 8,
  require_uppercase BOOLEAN DEFAULT true,
  require_lowercase BOOLEAN DEFAULT true,
  require_numbers BOOLEAN DEFAULT true,
  require_special_chars BOOLEAN DEFAULT true,
  max_age_days INTEGER DEFAULT 90,
  prevent_reuse_count INTEGER DEFAULT 5,
  lockout_attempts INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 11. TABELA DE HISTÓRICO DE SENHAS
CREATE TABLE IF NOT EXISTS public.password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =============================================

ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mfa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS DE SEGURANÇA
-- =============================================

-- Rate Limit Logs - Apenas admins podem ver
DROP POLICY IF EXISTS "Admins can view rate limit logs" ON public.rate_limit_logs;
CREATE POLICY "Admins can view rate limit logs" ON public.rate_limit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "System can insert rate limit logs" ON public.rate_limit_logs;
CREATE POLICY "System can insert rate limit logs" ON public.rate_limit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Blocked IPs - Apenas admins podem gerenciar
DROP POLICY IF EXISTS "Admins can manage blocked IPs" ON public.blocked_ips;
CREATE POLICY "Admins can manage blocked IPs" ON public.blocked_ips
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- IP Whitelist - Apenas admins podem gerenciar
DROP POLICY IF EXISTS "Admins can manage IP whitelist" ON public.ip_whitelist;
CREATE POLICY "Admins can manage IP whitelist" ON public.ip_whitelist
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- Rate Limit Config - Apenas admins podem gerenciar
DROP POLICY IF EXISTS "Admins can manage rate limit config" ON public.rate_limit_config;
CREATE POLICY "Admins can manage rate limit config" ON public.rate_limit_config
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- User Sessions - Usuários veem próprias sessões, admins veem todas
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;
CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can manage own sessions" ON public.user_sessions;
CREATE POLICY "Users can manage own sessions" ON public.user_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- User MFA - Usuários gerenciam próprio MFA
DROP POLICY IF EXISTS "Users can manage own MFA" ON public.user_mfa;
CREATE POLICY "Users can manage own MFA" ON public.user_mfa
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Login Attempts - Admins podem ver, sistema pode inserir
DROP POLICY IF EXISTS "Admins can view login attempts" ON public.login_attempts;
CREATE POLICY "Admins can view login attempts" ON public.login_attempts
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "System can insert login attempts" ON public.login_attempts;
CREATE POLICY "System can insert login attempts" ON public.login_attempts
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Verification Tokens - Usuários gerenciam próprios tokens
DROP POLICY IF EXISTS "Users can manage own tokens" ON public.verification_tokens;
CREATE POLICY "Users can manage own tokens" ON public.verification_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Security Alerts - Apenas admins
DROP POLICY IF EXISTS "Admins can view security alerts" ON public.security_alerts;
CREATE POLICY "Admins can view security alerts" ON public.security_alerts
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "System can insert security alerts" ON public.security_alerts;
CREATE POLICY "System can insert security alerts" ON public.security_alerts
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update security alerts" ON public.security_alerts;
CREATE POLICY "Admins can update security alerts" ON public.security_alerts
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Password Policies - Apenas admins podem modificar, todos podem ler
DROP POLICY IF EXISTS "All can read password policies" ON public.password_policies;
CREATE POLICY "All can read password policies" ON public.password_policies
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage password policies" ON public.password_policies;
CREATE POLICY "Admins can manage password policies" ON public.password_policies
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- Password History - Apenas sistema
DROP POLICY IF EXISTS "Users can view own password history" ON public.password_history;
CREATE POLICY "Users can view own password history" ON public.password_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- FUNÇÕES DE SEGURANÇA
-- =============================================

-- Função para verificar se IP está bloqueado
CREATE OR REPLACE FUNCTION public.is_ip_blocked(check_ip TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_ips
    WHERE ip_address = check_ip
    AND (permanent = true OR expires_at > now())
  )
$$;

-- Função para verificar se IP está na whitelist
CREATE OR REPLACE FUNCTION public.is_ip_whitelisted(check_ip TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ip_whitelist
    WHERE ip_address = check_ip
  )
$$;

-- Função para verificar rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  check_ip TEXT,
  check_endpoint TEXT,
  check_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  config_record RECORD;
  current_count INTEGER;
  is_blocked BOOLEAN;
  result JSONB;
BEGIN
  -- Verificar se IP está na whitelist
  IF public.is_ip_whitelisted(check_ip) THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'whitelisted');
  END IF;

  -- Verificar se IP está bloqueado
  IF public.is_ip_blocked(check_ip) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'blocked');
  END IF;

  -- Obter configuração de rate limit
  SELECT * INTO config_record FROM public.rate_limit_config
  WHERE endpoint = check_endpoint OR endpoint = '*'
  ORDER BY CASE WHEN endpoint = check_endpoint THEN 0 ELSE 1 END
  LIMIT 1;

  IF NOT FOUND OR NOT config_record.enabled THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'no_limit');
  END IF;

  -- Contar requisições na janela de tempo
  SELECT COUNT(*) INTO current_count
  FROM public.rate_limit_logs
  WHERE ip_address = check_ip
  AND endpoint = check_endpoint
  AND created_at > now() - (config_record.window_seconds || ' seconds')::INTERVAL;

  IF current_count >= config_record.max_requests THEN
    -- Bloquear IP temporariamente
    INSERT INTO public.blocked_ips (ip_address, reason, expires_at, permanent)
    VALUES (
      check_ip,
      'Rate limit exceeded for ' || check_endpoint,
      now() + (config_record.block_duration_seconds || ' seconds')::INTERVAL,
      false
    )
    ON CONFLICT (ip_address) DO UPDATE SET
      expires_at = now() + (config_record.block_duration_seconds || ' seconds')::INTERVAL;

    -- Criar alerta de segurança
    INSERT INTO public.security_alerts (type, severity, ip_address, user_id, details)
    VALUES (
      'rate_limit_exceeded',
      'high',
      check_ip,
      check_user_id,
      jsonb_build_object('endpoint', check_endpoint, 'count', current_count)
    );

    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'retry_after', config_record.block_duration_seconds
    );
  END IF;

  -- Registrar requisição
  INSERT INTO public.rate_limit_logs (ip_address, endpoint, user_id)
  VALUES (check_ip, check_endpoint, check_user_id);

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', config_record.max_requests - current_count - 1,
    'reset_in', config_record.window_seconds
  );
END;
$$;

-- Função para verificar força bruta
CREATE OR REPLACE FUNCTION public.check_brute_force(
  check_email TEXT,
  check_ip TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_count INTEGER;
  policy_record RECORD;
BEGIN
  -- Obter política de senha
  SELECT * INTO policy_record FROM public.password_policies LIMIT 1;
  
  IF NOT FOUND THEN
    -- Valores padrão se não houver política
    policy_record.lockout_attempts := 5;
    policy_record.lockout_duration_minutes := 30;
  END IF;

  -- Contar tentativas falhas recentes
  SELECT COUNT(*) INTO failed_count
  FROM public.login_attempts
  WHERE (email = check_email OR ip_address = check_ip)
  AND success = false
  AND created_at > now() - (policy_record.lockout_duration_minutes || ' minutes')::INTERVAL;

  IF failed_count >= policy_record.lockout_attempts THEN
    -- Criar alerta de segurança
    INSERT INTO public.security_alerts (type, severity, ip_address, details)
    VALUES (
      'brute_force',
      'critical',
      check_ip,
      jsonb_build_object('email', check_email, 'attempts', failed_count)
    );

    RETURN jsonb_build_object(
      'locked', true,
      'attempts', failed_count,
      'lockout_minutes', policy_record.lockout_duration_minutes
    );
  END IF;

  RETURN jsonb_build_object(
    'locked', false,
    'attempts', failed_count,
    'remaining', policy_record.lockout_attempts - failed_count
  );
END;
$$;

-- Função para limpeza automática de logs antigos
CREATE OR REPLACE FUNCTION public.cleanup_security_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Limpar rate limit logs com mais de 7 dias
  DELETE FROM public.rate_limit_logs WHERE created_at < now() - INTERVAL '7 days';
  
  -- Limpar login attempts com mais de 30 dias
  DELETE FROM public.login_attempts WHERE created_at < now() - INTERVAL '30 days';
  
  -- Limpar verification tokens expirados
  DELETE FROM public.verification_tokens WHERE expires_at < now();
  
  -- Limpar bloqueios temporários expirados
  DELETE FROM public.blocked_ips WHERE permanent = false AND expires_at < now();
  
  -- Limpar sessões expiradas
  DELETE FROM public.user_sessions WHERE expires_at < now();
END;
$$;

-- =============================================
-- INSERIR CONFIGURAÇÕES PADRÃO
-- =============================================

-- Configuração padrão de rate limit
INSERT INTO public.rate_limit_config (endpoint, max_requests, window_seconds, block_duration_seconds)
VALUES 
  ('*', 1000, 60, 3600),
  ('/auth/login', 5, 60, 900),
  ('/auth/register', 3, 60, 1800),
  ('/auth/reset-password', 3, 60, 1800),
  ('/api/*', 100, 60, 600)
ON CONFLICT (endpoint) DO NOTHING;

-- Política de senha padrão
INSERT INTO public.password_policies (
  min_length, require_uppercase, require_lowercase, 
  require_numbers, require_special_chars, max_age_days,
  prevent_reuse_count, lockout_attempts, lockout_duration_minutes
)
VALUES (12, true, true, true, true, 90, 5, 5, 30)
ON CONFLICT DO NOTHING;

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_ip_endpoint ON public.rate_limit_logs(ip_address, endpoint, created_at);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON public.blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires ON public.blocked_ips(expires_at) WHERE permanent = false;
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_ip ON public.ip_whitelist(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_ip ON public.login_attempts(email, ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON public.security_alerts(type, severity, resolved);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON public.verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_user_mfa_user ON public.user_mfa(user_id);