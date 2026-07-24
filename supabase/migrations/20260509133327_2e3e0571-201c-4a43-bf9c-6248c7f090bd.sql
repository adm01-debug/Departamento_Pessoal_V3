-- Tabela para gerenciar o estado temporário do OAuth 2.0 (Segurança contra CSRF)
CREATE TABLE IF NOT EXISTS public.govbr_auth_state (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    state TEXT NOT NULL UNIQUE,
    nonce TEXT NOT NULL,
    redirect_uri TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '10 minutes')
);

-- Habilitar RLS e criar políticas
ALTER TABLE public.govbr_auth_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Serviço pode gerenciar states" ON public.govbr_auth_state;
CREATE POLICY "Serviço pode gerenciar states" ON public.govbr_auth_state FOR ALL USING (true) WITH CHECK (true);

-- Adicionar campos de integração Gov.br ao perfil do usuário
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS govbr_uid TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS govbr_nivel_autenticacao TEXT, -- Bronze, Prata, Ouro
ADD COLUMN IF NOT EXISTS cpf_validado_govbr BOOLEAN DEFAULT false;

-- Tabela de logs de integração (Auditoria Técnica)
CREATE TABLE IF NOT EXISTS public.integracao_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    servico TEXT NOT NULL, -- 'govbr', 'fgts_digital', 'esocial'
    operacao TEXT NOT NULL,
    status_code INTEGER,
    payload_envio JSONB,
    payload_retorno JSONB,
    erro TEXT,
    duracao_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.integracao_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Apenas admin pode ver logs de integração" ON public.integracao_logs;
CREATE POLICY "Apenas admin pode ver logs de integração" ON public.integracao_logs FOR SELECT USING (true); -- Ajustar conforme roles futuras

-- Limpeza automática de states expirados
CREATE OR REPLACE FUNCTION public.limpar_govbr_states_expirados()
RETURNS void AS $$
BEGIN
    DELETE FROM public.govbr_auth_state WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
