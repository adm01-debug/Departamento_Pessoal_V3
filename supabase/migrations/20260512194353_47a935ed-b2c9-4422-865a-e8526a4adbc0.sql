-- Tabela de Homologações
CREATE TABLE IF NOT EXISTS public.homologacoes_rescisao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    desligamento_id UUID NOT NULL REFERENCES public.desligamentos(id) ON DELETE CASCADE,
    etapa TEXT NOT NULL, -- 'rh', 'financeiro', 'juridico', 'colaborador'
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'aprovado', 'rejeitado'
    parecer TEXT,
    usuario_id UUID REFERENCES auth.users(id),
    data_decisao TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Verbas Rescisórias (Itemizado)
CREATE TABLE IF NOT EXISTS public.verbas_rescisorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    desligamento_id UUID NOT NULL REFERENCES public.desligamentos(id) ON DELETE CASCADE,
    rubrica_id UUID REFERENCES public.rubricas_folha(id),
    codigo TEXT,
    descricao TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'provento', 'desconto'
    valor NUMERIC(15,2) NOT NULL,
    incide_inss BOOLEAN DEFAULT false,
    incide_irrf BOOLEAN DEFAULT false,
    incide_fgts BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar colunas de assinatura no desligamento se não existirem
ALTER TABLE public.desligamentos 
ADD COLUMN IF NOT EXISTS assinado_empresa BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS assinado_colaborador BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hash_assinatura_empresa TEXT,
ADD COLUMN IF NOT EXISTS hash_assinatura_colaborador TEXT,
ADD COLUMN IF NOT EXISTS data_assinatura_empresa TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_assinatura_colaborador TIMESTAMP WITH TIME ZONE;

-- RLS
ALTER TABLE public.homologacoes_rescisao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verbas_rescisorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso homologacoes por empresa" ON public.homologacoes_rescisao;
CREATE POLICY "Acesso homologacoes por empresa" ON public.homologacoes_rescisao
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.desligamentos d
        JOIN public.user_empresas ue ON d.empresa_id = ue.empresa_id
        WHERE d.id = homologacoes_rescisao.desligamento_id AND ue.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Acesso verbas por empresa" ON public.verbas_rescisorias;
CREATE POLICY "Acesso verbas por empresa" ON public.verbas_rescisorias
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.desligamentos d
        JOIN public.user_empresas ue ON d.empresa_id = ue.empresa_id
        WHERE d.id = verbas_rescisorias.desligamento_id AND ue.user_id = auth.uid()
    )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_homologacoes_desligamento ON public.homologacoes_rescisao(desligamento_id);
CREATE INDEX IF NOT EXISTS idx_verbas_desligamento ON public.verbas_rescisorias(desligamento_id);
