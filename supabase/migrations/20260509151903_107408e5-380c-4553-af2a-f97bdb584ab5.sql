-- 1. Tabelas Base
CREATE TABLE IF NOT EXISTS public.admissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id),
    nome TEXT NOT NULL,
    email TEXT,
    cpf TEXT,
    cargo TEXT,
    departamento TEXT,
    salario_proposto DECIMAL(12,2),
    data_prevista DATE,
    status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'em_andamento', 'concluido', 'cancelado')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admissao_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admissao_id UUID NOT NULL REFERENCES public.admissoes(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    email_candidato TEXT NOT NULL,
    data_expiracao TIMESTAMP WITH TIME ZONE NOT NULL,
    usado BOOLEAN DEFAULT false,
    contrato_assinado BOOLEAN DEFAULT false,
    assinado_em TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notificacoes_admissao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admissao_id UUID NOT NULL REFERENCES public.admissoes(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'email', 'whatsapp'
    canal TEXT NOT NULL,
    status TEXT NOT NULL, -- 'pendente', 'enviado', 'erro'
    mensagem TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Segurança (RLS)
ALTER TABLE public.admissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissao_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes_admissao ENABLE ROW LEVEL SECURITY;

-- Como não há uma coluna empresa_id direta em user_roles, usaremos uma abordagem baseada em permissão genérica ou acesso total para usuários autenticados (RH)
-- Em um cenário real, haveria um vínculo entre auth.uid() e empresa_id.
DROP POLICY IF EXISTS "RH pode gerenciar admissoes" ON public.admissoes;
CREATE POLICY "RH pode gerenciar admissoes" ON public.admissoes
FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "RH pode gerenciar tokens" ON public.admissao_tokens;
CREATE POLICY "RH pode gerenciar tokens" ON public.admissao_tokens
FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Candidato pode acessar seu proprio token" ON public.admissao_tokens;
CREATE POLICY "Candidato pode acessar seu proprio token" ON public.admissao_tokens
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "RH pode ver notificacoes" ON public.notificacoes_admissao;
CREATE POLICY "RH pode ver notificacoes" ON public.notificacoes_admissao
FOR SELECT TO authenticated USING (true);

-- 3. Automação
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_admissoes_updated_at ON public.admissoes;
CREATE TRIGGER tr_admissoes_updated_at BEFORE UPDATE ON public.admissoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_admissao_tokens_updated_at ON public.admissao_tokens;
CREATE TRIGGER tr_admissao_tokens_updated_at BEFORE UPDATE ON public.admissao_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
