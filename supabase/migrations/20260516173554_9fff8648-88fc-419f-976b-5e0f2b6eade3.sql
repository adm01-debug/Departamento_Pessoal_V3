-- 1. RUBRICAS (Proventos e Descontos)
CREATE TABLE IF NOT EXISTS public.rubricas_folha (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    codigo VARCHAR(10) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('provento', 'desconto', 'informativo')),
    incide_inss BOOLEAN DEFAULT false,
    incide_irrf BOOLEAN DEFAULT false,
    incide_fgts BOOLEAN DEFAULT false,
    natureza_esocial VARCHAR(10),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FOLHAS DE PAGAMENTO (Cabeçalho)
CREATE TABLE IF NOT EXISTS public.folhas_pagamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    competencia CHAR(7) NOT NULL, -- Formato YYYY-MM
    tipo VARCHAR(20) DEFAULT 'mensal' CHECK (tipo IN ('mensal', 'adiantamento', '13_primeiro', '13_segundo', 'ferias', 'rescisao')),
    status VARCHAR(20) DEFAULT 'aberto' CHECK (status IN ('aberto', 'calculado', 'fechado', 'pago')),
    data_pagamento DATE,
    total_bruto DECIMAL(15,2) DEFAULT 0,
    total_descontos DECIMAL(15,2) DEFAULT 0,
    total_liquido DECIMAL(15,2) DEFAULT 0,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ITENS DA FOLHA (Lançamentos Individuais)
CREATE TABLE IF NOT EXISTS public.itens_folha (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folha_id UUID NOT NULL REFERENCES public.folhas_pagamento(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    rubrica_id UUID NOT NULL REFERENCES public.rubricas_folha(id),
    quantidade DECIMAL(10,2) DEFAULT 0,
    valor DECIMAL(15,2) NOT NULL,
    referencia VARCHAR(50), 
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BENEFÍCIOS (Catálogo)
CREATE TABLE IF NOT EXISTS public.beneficios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL, 
    valor_padrao DECIMAL(15,2),
    desconto_percentual DECIMAL(5,2),
    fornecedor VARCHAR(100),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. VÍNCULO BENEFÍCIOS X COLABORADORES
CREATE TABLE IF NOT EXISTS public.beneficios_colaboradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    beneficio_id UUID NOT NULL REFERENCES public.beneficios(id) ON DELETE CASCADE,
    valor_customizado DECIMAL(15,2),
    data_inicio DATE NOT NULL,
    data_fim DATE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.rubricas_folha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folhas_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_folha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficios_colaboradores ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Empresa vê suas próprias rubricas') THEN
        CREATE POLICY "Empresa vê suas próprias rubricas" ON public.rubricas_folha FOR ALL USING (empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Empresa vê suas próprias folhas') THEN
        CREATE POLICY "Empresa vê suas próprias folhas" ON public.folhas_pagamento FOR ALL USING (empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Empresa vê seus benefícios') THEN
        CREATE POLICY "Empresa vê seus benefícios" ON public.beneficios FOR ALL USING (empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acesso aos itens via folha') THEN
        CREATE POLICY "Acesso aos itens via folha" ON public.itens_folha FOR ALL USING (
            EXISTS (SELECT 1 FROM public.folhas_pagamento f WHERE f.id = folha_id AND f.empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()))
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Empresa vê benefícios dos colaboradores') THEN
        CREATE POLICY "Empresa vê benefícios dos colaboradores" ON public.beneficios_colaboradores FOR ALL USING (
            EXISTS (SELECT 1 FROM public.colaboradores c WHERE c.id = colaborador_id AND c.empresa_id IN (SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()))
        );
    END IF;
END $$;

-- Views (Remoção e Re-criação para evitar erro de drop column em view)
DROP VIEW IF EXISTS public.vw_colaboradores_completo CASCADE;
DROP VIEW IF EXISTS public.vw_espelho_ponto_mensal CASCADE;

CREATE OR REPLACE VIEW public.vw_colaboradores_completo AS
SELECT 
    c.id,
    c.nome_completo,
    c.cpf,
    c.data_admissao,
    c.status,
    e.nome_fantasia AS empresa_nome,
    c.email
FROM public.colaboradores c
LEFT JOIN public.empresas e ON c.empresa_id = e.id;

CREATE OR REPLACE VIEW public.vw_espelho_ponto_mensal AS
SELECT 
    p.colaborador_id,
    c.nome_completo AS colaborador_nome,
    to_char(p.data, 'YYYY-MM') AS competencia,
    count(p.id) AS dias_registrados
FROM public.registros_ponto p
JOIN public.colaboradores c ON p.colaborador_id = c.id
GROUP BY p.colaborador_id, c.nome_completo, to_char(p.data, 'YYYY-MM');

-- Triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_updated_at_rubricas') THEN
        CREATE TRIGGER tr_updated_at_rubricas BEFORE UPDATE ON public.rubricas_folha FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_updated_at_folhas') THEN
        CREATE TRIGGER tr_updated_at_folhas BEFORE UPDATE ON public.folhas_pagamento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_updated_at_beneficios') THEN
        CREATE TRIGGER tr_updated_at_beneficios BEFORE UPDATE ON public.beneficios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;