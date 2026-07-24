-- Tabela de Empréstimos Consignados
CREATE TABLE IF NOT EXISTS public.emprestimos_consignados (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    valor_total DECIMAL(12,2) NOT NULL,
    valor_parcela DECIMAL(12,2) NOT NULL,
    numero_parcelas INTEGER NOT NULL,
    parcelas_pagas INTEGER DEFAULT 0,
    data_inicio DATE NOT NULL,
    taxa_juros DECIMAL(5,2),
    instituicao_financeira TEXT,
    status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'quitado', 'suspenso', 'cancelado')),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Adiantamentos Salariais
CREATE TABLE IF NOT EXISTS public.adiantamentos_salariais (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    valor_solicitado DECIMAL(12,2) NOT NULL,
    data_solicitacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_pagamento DATE,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'pago')),
    motivo TEXT,
    aprovado_por UUID REFERENCES auth.users(id),
    competencia_desconto TEXT NOT NULL, -- Format: YYYY-MM
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.emprestimos_consignados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adiantamentos_salariais ENABLE ROW LEVEL SECURITY;

-- Políticas para Empréstimos (Focadas em gestores por agora, políticas de colaborador precisam de mapeamento auth.uid)
DROP POLICY IF EXISTS "Gestores podem gerenciar empréstimos da empresa" ON public.emprestimos_consignados;
CREATE POLICY "Gestores podem gerenciar empréstimos da empresa" 
ON public.emprestimos_consignados 
FOR ALL
USING (empresa_id IN (SELECT id FROM public.empresas));

-- Políticas para Adiantamentos
DROP POLICY IF EXISTS "Gestores podem gerenciar adiantamentos da empresa" ON public.adiantamentos_salariais;
CREATE POLICY "Gestores podem gerenciar adiantamentos da empresa" 
ON public.adiantamentos_salariais 
FOR ALL
USING (empresa_id IN (SELECT id FROM public.empresas));

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_emprestimos_updated_at ON public.emprestimos_consignados;
CREATE TRIGGER update_emprestimos_updated_at BEFORE UPDATE ON public.emprestimos_consignados FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_adiantamentos_updated_at ON public.adiantamentos_salariais;
CREATE TRIGGER update_adiantamentos_updated_at BEFORE UPDATE ON public.adiantamentos_salariais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
