-- Plano de Contas
CREATE TABLE IF NOT EXISTS public.plano_contas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL, -- ex: 1.1.01.001
    nome TEXT NOT NULL, -- ex: Salários a Pagar
    tipo TEXT NOT NULL, -- 'ativo', 'passivo', 'receita', 'despesa', 'patrimonio'
    natureza TEXT NOT NULL, -- 'devedora', 'credora'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(empresa_id, codigo)
);

-- Lançamentos Contábeis
CREATE TABLE IF NOT EXISTS public.lancamentos_contabeis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    folha_id UUID REFERENCES public.folhas_pagamento(id) ON DELETE SET NULL,
    data_lancamento DATE NOT NULL,
    descricao TEXT NOT NULL,
    valor DECIMAL(18,2) NOT NULL,
    conta_debito_id UUID REFERENCES public.plano_contas(id),
    conta_credito_id UUID REFERENCES public.plano_contas(id),
    origem TEXT NOT NULL DEFAULT 'folha', -- 'folha', 'ferias', 'rescisao', 'manual'
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'conciliado', 'estornado'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plano_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_contabeis ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Empresas can view their own plano de contas" ON public.plano_contas;
CREATE POLICY "Empresas can view their own plano de contas" ON public.plano_contas FOR SELECT USING (empresa_id IN (SELECT id FROM public.empresas));
DROP POLICY IF EXISTS "Empresas can view their own lancamentos" ON public.lancamentos_contabeis;
CREATE POLICY "Empresas can view their own lancamentos" ON public.lancamentos_contabeis FOR SELECT USING (empresa_id IN (SELECT id FROM public.empresas));

-- Trigger Updated At
DROP TRIGGER IF EXISTS update_plano_contas_updated_at ON public.plano_contas;
CREATE TRIGGER update_plano_contas_updated_at BEFORE UPDATE ON public.plano_contas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_lancamentos_contabeis_updated_at ON public.lancamentos_contabeis;
CREATE TRIGGER update_lancamentos_contabeis_updated_at BEFORE UPDATE ON public.lancamentos_contabeis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Default Accounts for common payroll operations
INSERT INTO public.plano_contas (empresa_id, codigo, nome, tipo, natureza)
SELECT id, '2.1.01.001', 'Salários a Pagar', 'passivo', 'credora' FROM public.empresas
ON CONFLICT DO NOTHING;

INSERT INTO public.plano_contas (empresa_id, codigo, nome, tipo, natureza)
SELECT id, '3.1.01.001', 'Despesas com Salários', 'despesa', 'devedora' FROM public.empresas
ON CONFLICT DO NOTHING;

INSERT INTO public.plano_contas (empresa_id, codigo, nome, tipo, natureza)
SELECT id, '2.1.01.002', 'INSS a Recolher', 'passivo', 'credora' FROM public.empresas
ON CONFLICT DO NOTHING;

INSERT INTO public.plano_contas (empresa_id, codigo, nome, tipo, natureza)
SELECT id, '2.1.01.003', 'FGTS a Recolher', 'passivo', 'credora' FROM public.empresas
ON CONFLICT DO NOTHING;
