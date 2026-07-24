-- CNAB Remessas
CREATE TABLE IF NOT EXISTS public.cnab_remessas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    banco_codigo TEXT NOT NULL,
    sequencial_arquivo INTEGER NOT NULL,
    data_geracao TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'gerado', -- 'gerado', 'enviado', 'processado', 'erro'
    arquivo_url TEXT,
    total_pagamentos INTEGER DEFAULT 0,
    valor_total DECIMAL(18,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CNAB Itens
CREATE TABLE IF NOT EXISTS public.cnab_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    remessa_id UUID NOT NULL REFERENCES public.cnab_remessas(id) ON DELETE CASCADE,
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL,
    nome_favorecido TEXT NOT NULL,
    cpf_cnpj_favorecido TEXT NOT NULL,
    banco_favorecido TEXT,
    agencia_favorecido TEXT,
    conta_favorecido TEXT,
    valor_pagamento DECIMAL(18,2) NOT NULL,
    data_pagamento DATE NOT NULL,
    tipo_pagamento TEXT, -- 'salario', 'ferias', 'rescisao', 'bonus'
    status TEXT DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- PIX Lotes
CREATE TABLE IF NOT EXISTS public.pix_lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'aberto', -- 'aberto', 'finalizado', 'erro'
    valor_total DECIMAL(18,2) DEFAULT 0,
    quantidade_pagamentos INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- PIX Itens
CREATE TABLE IF NOT EXISTS public.pix_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_id UUID NOT NULL REFERENCES public.pix_lotes(id) ON DELETE CASCADE,
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL,
    chave_pix TEXT NOT NULL,
    tipo_chave TEXT NOT NULL, -- 'cpf', 'cnpj', 'email', 'telefone', 'aleatoria'
    valor DECIMAL(18,2) NOT NULL,
    descricao TEXT,
    status TEXT DEFAULT 'pendente',
    end_to_end_id TEXT, -- ID retornado pelo banco
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cnab_remessas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cnab_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pix_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pix_itens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Empresas can view their own CNAB remessas" ON public.cnab_remessas;
CREATE POLICY "Empresas can view their own CNAB remessas" ON public.cnab_remessas FOR SELECT USING (empresa_id IN (SELECT id FROM public.empresas));
DROP POLICY IF EXISTS "Empresas can insert their own CNAB remessas" ON public.cnab_remessas;
CREATE POLICY "Empresas can insert their own CNAB remessas" ON public.cnab_remessas FOR INSERT WITH CHECK (empresa_id IN (SELECT id FROM public.empresas));

DROP POLICY IF EXISTS "Empresas can view their own CNAB itens" ON public.cnab_itens;
CREATE POLICY "Empresas can view their own CNAB itens" ON public.cnab_itens FOR SELECT USING (remessa_id IN (SELECT id FROM public.cnab_remessas));
DROP POLICY IF EXISTS "Empresas can insert their own CNAB itens" ON public.cnab_itens;
CREATE POLICY "Empresas can insert their own CNAB itens" ON public.cnab_itens FOR INSERT WITH CHECK (remessa_id IN (SELECT id FROM public.cnab_remessas));

DROP POLICY IF EXISTS "Empresas can view their own PIX lotes" ON public.pix_lotes;
CREATE POLICY "Empresas can view their own PIX lotes" ON public.pix_lotes FOR SELECT USING (empresa_id IN (SELECT id FROM public.empresas));
DROP POLICY IF EXISTS "Empresas can insert their own PIX lotes" ON public.pix_lotes;
CREATE POLICY "Empresas can insert their own PIX lotes" ON public.pix_lotes FOR INSERT WITH CHECK (empresa_id IN (SELECT id FROM public.empresas));

DROP POLICY IF EXISTS "Empresas can view their own PIX itens" ON public.pix_itens;
CREATE POLICY "Empresas can view their own PIX itens" ON public.pix_itens FOR SELECT USING (lote_id IN (SELECT id FROM public.pix_lotes));
DROP POLICY IF EXISTS "Empresas can insert their own PIX itens" ON public.pix_itens;
CREATE POLICY "Empresas can insert their own PIX itens" ON public.pix_itens FOR INSERT WITH CHECK (lote_id IN (SELECT id FROM public.pix_lotes));

-- Updated At Triggers
DROP TRIGGER IF EXISTS update_cnab_remessas_updated_at ON public.cnab_remessas;
CREATE TRIGGER update_cnab_remessas_updated_at BEFORE UPDATE ON public.cnab_remessas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_pix_lotes_updated_at ON public.pix_lotes;
CREATE TRIGGER update_pix_lotes_updated_at BEFORE UPDATE ON public.pix_lotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
