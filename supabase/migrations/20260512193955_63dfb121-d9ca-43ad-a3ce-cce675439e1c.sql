-- Garantir RLS na tabela de rubricas
ALTER TABLE public.rubricas_folha ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresas podem ver suas rubricas" ON public.rubricas_folha;
CREATE POLICY "Empresas podem ver suas rubricas"
ON public.rubricas_folha
FOR SELECT
USING (auth.uid() IN (
    SELECT user_id FROM public.user_empresas WHERE empresa_id = rubricas_folha.empresa_id
));

-- Adicionar rubricas padrão se não existirem
INSERT INTO public.rubricas_folha (codigo, descricao, tipo, incide_inss, incide_irrf, incide_fgts, automatico, ativo)
VALUES 
('1000', 'Salário Base', 'provento', true, true, true, true, true),
('1001', 'Horas Extras 50%', 'provento', true, true, true, false, true),
('1002', 'Horas Extras 100%', 'provento', true, true, true, false, true),
('1003', 'DSR sobre Horas Extras', 'provento', true, true, true, true, true),
('5000', 'Desconto INSS', 'desconto', false, false, false, true, true),
('5001', 'Desconto IRRF', 'desconto', false, false, false, true, true),
('5005', 'Faltas e Atrasos', 'desconto', true, true, true, false, true)
ON CONFLICT (codigo, empresa_id) DO NOTHING;

-- Melhorar tabela de holerites para conformidade digital
ALTER TABLE public.holerites 
ADD COLUMN IF NOT EXISTS hash_assinatura TEXT,
ADD COLUMN IF NOT EXISTS data_assinatura TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assinado BOOLEAN DEFAULT FALSE;

-- Índices de performance para cálculos em lote
CREATE INDEX IF NOT EXISTS idx_folha_itens_folha_id ON public.folha_itens(folha_id);
CREATE INDEX IF NOT EXISTS idx_folha_itens_colaborador_id ON public.folha_itens(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_folhas_pagamento_competencia ON public.folhas_pagamento(competencia);
