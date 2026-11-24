-- Tabela de Campanhas de Premiação
CREATE TABLE IF NOT EXISTS public.premiacoes_campanhas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'rascunho', -- rascunho, ativo, suspenso, finalizado
    orcamento_estimado DECIMAL(12,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Regras da Premiação
CREATE TABLE IF NOT EXISTS public.premiacoes_regras (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    campanha_id UUID NOT NULL REFERENCES public.premiacoes_campanhas(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    tipo_calculo TEXT NOT NULL, -- fixo, percentual_salario, percentual_vendas, tiers
    valor_base DECIMAL(12,2),
    meta_id UUID REFERENCES public.metas_okrs(id), -- Opcional: vincula a uma meta específica
    configuracao JSONB DEFAULT '{}'::jsonb, -- Armazena tiers ou detalhes específicos
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Registro de Pagamentos/Cálculos
CREATE TABLE IF NOT EXISTS public.premiacoes_pagamentos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    campanha_id UUID NOT NULL REFERENCES public.premiacoes_campanhas(id) ON DELETE CASCADE,
    regra_id UUID NOT NULL REFERENCES public.premiacoes_regras(id) ON DELETE CASCADE,
    valor_calculado DECIMAL(12,2) NOT NULL,
    valor_aprovado DECIMAL(12,2),
    status TEXT NOT NULL DEFAULT 'calculado', -- calculado, revisado, aprovado, pago, cancelado
    data_pagamento DATE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.premiacoes_campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premiacoes_regras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premiacoes_pagamentos ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own company campaigns" ON public.premiacoes_campanhas;
CREATE POLICY "Users can view their own company campaigns" ON public.premiacoes_campanhas
    FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE empresa_id = premiacoes_campanhas.empresa_id));

DROP POLICY IF EXISTS "Users can manage their own company campaigns" ON public.premiacoes_campanhas;
CREATE POLICY "Users can manage their own company campaigns" ON public.premiacoes_campanhas
    FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE empresa_id = premiacoes_campanhas.empresa_id));

DROP POLICY IF EXISTS "Users can view rewards rules" ON public.premiacoes_regras;
CREATE POLICY "Users can view rewards rules" ON public.premiacoes_regras
    FOR SELECT USING (true); -- Filtered by campaign access in app

CREATE POLICY "Users can manage rewards rules" ON public.premiacoes_regras
    FOR ALL USING (true); -- Filtered by campaign access in app

CREATE POLICY "Users can view rewards payments" ON public.premiacoes_pagamentos
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage rewards payments" ON public.premiacoes_pagamentos;
CREATE POLICY "Users can manage rewards payments" ON public.premiacoes_pagamentos
    FOR ALL USING (true);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_premiacoes_campanhas_updated_at ON public.premiacoes_campanhas;
CREATE TRIGGER update_premiacoes_campanhas_updated_at BEFORE UPDATE ON public.premiacoes_campanhas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_premiacoes_pagamentos_updated_at ON public.premiacoes_pagamentos;
CREATE TRIGGER update_premiacoes_pagamentos_updated_at BEFORE UPDATE ON public.premiacoes_pagamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
