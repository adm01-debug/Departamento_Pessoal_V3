-- 1. Estrutura de Cabeçalho da Folha
CREATE TABLE IF NOT EXISTS public.folhas_pagamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id),
    competencia TEXT NOT NULL, -- Formato YYYY-MM
    tipo TEXT DEFAULT 'mensal' CHECK (tipo IN ('mensal', '13_primeira', '13_segunda', 'complementar', 'rescisao')),
    status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'calculada', 'fechada', 'paga', 'cancelada')),
    total_proventos DECIMAL(12,2) DEFAULT 0,
    total_descontos DECIMAL(12,2) DEFAULT 0,
    total_liquido DECIMAL(12,2) DEFAULT 0,
    total_encargos DECIMAL(12,2) DEFAULT 0, -- FGTS/INSS Patronal
    total_colaboradores INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(empresa_id, competencia, tipo)
);

-- 2. Itens Detalhados da Folha (Holerite Digital)
CREATE TABLE IF NOT EXISTS public.folha_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folha_id UUID NOT NULL REFERENCES public.folhas_pagamento(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id),
    salario_base DECIMAL(12,2) DEFAULT 0,
    total_proventos DECIMAL(12,2) DEFAULT 0,
    total_descontos DECIMAL(12,2) DEFAULT 0,
    total_liquido DECIMAL(12,2) DEFAULT 0,
    fgts_mes DECIMAL(12,2) DEFAULT 0,
    inss_mes DECIMAL(12,2) DEFAULT 0,
    irrf_mes DECIMAL(12,2) DEFAULT 0,
    detalhes JSONB DEFAULT '[]'::jsonb, -- Array de rubricas (descrição, tipo, valor)
    status_pagamento TEXT DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Segurança (RLS)
ALTER TABLE public.folhas_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folha_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresas gerenciam suas proprias folhas" ON public.folhas_pagamento;
CREATE POLICY "Empresas gerenciam suas proprias folhas" ON public.folhas_pagamento
FOR ALL TO authenticated USING (true); -- Em prod: vincular ao empresa_id do user

CREATE POLICY "Empresas gerenciam itens da folha" ON public.folha_itens
FOR ALL TO authenticated USING (true);

-- 4. Automação de Timestamps
CREATE OR REPLACE FUNCTION update_folha_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_folhas_updated_at ON public.folhas_pagamento;
CREATE TRIGGER tr_folhas_updated_at BEFORE UPDATE ON public.folhas_pagamento FOR EACH ROW EXECUTE FUNCTION update_folha_updated_at();
