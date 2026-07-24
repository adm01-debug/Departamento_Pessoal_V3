-- Tabela para provisionamento
CREATE TABLE IF NOT EXISTS public.provisoes_folha (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
    competencia TEXT NOT NULL,
    valor_13_salario DECIMAL(12,2) DEFAULT 0,
    valor_ferias DECIMAL(12,2) DEFAULT 0,
    encargos_provisao DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.provisoes_folha ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Visualização por empresa provisoes" ON public.provisoes_folha;
CREATE POLICY "Visualização por empresa provisoes" 
ON public.provisoes_folha FOR SELECT 
TO authenticated
USING (empresa_id::uuid = (auth.jwt()->>'empresa_id')::uuid);

-- Função para calcular provisão automática (simples: 1/12 avos)
CREATE OR REPLACE FUNCTION public.calcular_provisao_mensal()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.provisoes_folha (empresa_id, colaborador_id, competencia, valor_13_salario, valor_ferias, encargos_provisao)
    VALUES (
        NEW.empresa_id,
        NEW.colaborador_id,
        NEW.competencia,
        NEW.total_proventos / 12,
        (NEW.total_proventos / 12) * 1.33, -- 1/12 + 1/3
        (NEW.total_proventos / 12) * 0.28 -- Simulação de encargos (FGTS + RAT + etc)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para disparar após cálculo de folha mensal
DROP TRIGGER IF EXISTS trigger_gerar_provisao ON public.folhas_pagamento;
CREATE TRIGGER trigger_gerar_provisao
AFTER INSERT OR UPDATE ON public.folhas_pagamento
FOR EACH ROW
WHEN (NEW.tipo = 'mensal' AND NEW.status = 'calculada')
EXECUTE FUNCTION public.calcular_provisao_mensal();