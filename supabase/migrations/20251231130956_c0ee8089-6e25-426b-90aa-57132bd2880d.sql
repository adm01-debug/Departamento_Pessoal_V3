-- Tabela para whitelist de países permitidos
CREATE TABLE IF NOT EXISTS public.geo_allowed_countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code VARCHAR(2) NOT NULL UNIQUE,
    country_name VARCHAR(100) NOT NULL,
    added_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Configuração do bloqueio geográfico
CREATE TABLE IF NOT EXISTS public.geo_blocking_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enabled BOOLEAN DEFAULT false,
    block_unknown_countries BOOLEAN DEFAULT true,
    log_blocked_attempts BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Log de tentativas bloqueadas
CREATE TABLE IF NOT EXISTS public.geo_blocked_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(45) NOT NULL,
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO public.geo_blocking_config (enabled, block_unknown_countries, log_blocked_attempts) 
VALUES (false, true, true);

-- RLS
ALTER TABLE public.geo_allowed_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_blocking_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_blocked_attempts ENABLE ROW LEVEL SECURITY;

-- Políticas para admins
DROP POLICY IF EXISTS "Admins can manage geo_allowed_countries" ON public.geo_allowed_countries;
CREATE POLICY "Admins can manage geo_allowed_countries" ON public.geo_allowed_countries
    FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage geo_blocking_config" ON public.geo_blocking_config;
CREATE POLICY "Admins can manage geo_blocking_config" ON public.geo_blocking_config
    FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view geo_blocked_attempts" ON public.geo_blocked_attempts;
CREATE POLICY "Admins can view geo_blocked_attempts" ON public.geo_blocked_attempts
    FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Função para verificar se país é permitido
CREATE OR REPLACE FUNCTION public.is_country_allowed(check_country_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN NOT EXISTS (SELECT 1 FROM geo_blocking_config WHERE enabled = true) THEN true
    WHEN check_country_code IS NULL THEN NOT EXISTS (SELECT 1 FROM geo_blocking_config WHERE block_unknown_countries = true AND enabled = true)
    ELSE EXISTS (SELECT 1 FROM geo_allowed_countries WHERE country_code = check_country_code)
  END
$$;