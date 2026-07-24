-- 1. Tabela de Provisões Mensais (Férias e 13º)
CREATE TABLE IF NOT EXISTS public.provisoes_mensais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id),
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id),
    competencia DATE NOT NULL, -- Primeiro dia do mês de referência
    tipo TEXT NOT NULL CHECK (tipo IN ('ferias', '13_salario')),
    valor_principal DECIMAL(12,2) NOT NULL DEFAULT 0, -- 1/12 do salário (+ 1/3 se férias)
    encargos_inss DECIMAL(12,2) NOT NULL DEFAULT 0,
    encargos_fgts DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(colaborador_id, competencia, tipo)
);

-- 2. Tabela de Logs de Processamento (Auditoria Contábil)
CREATE TABLE IF NOT EXISTS public.provisao_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id),
    competencia TEXT NOT NULL,
    status TEXT DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_PROCESSAMENTO', 'CONCLUIDO', 'ERRO')),
    valor_total_provisionado DECIMAL(12,2) DEFAULT 0,
    total_colaboradores INTEGER DEFAULT 0,
    duracao_ms INTEGER,
    mensagem_erro TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.provisoes_mensais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provisao_logs ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acesso
DROP POLICY IF EXISTS "RH pode gerenciar provisoes" ON public.provisoes_mensais;
CREATE POLICY "RH pode gerenciar provisoes" ON public.provisoes_mensais
FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "RH pode ver logs de provisao" ON public.provisao_logs;
CREATE POLICY "RH pode ver logs de provisao" ON public.provisao_logs
FOR ALL TO authenticated USING (true);

-- 5. Função de Cálculo do Total (Trigger)
CREATE OR REPLACE FUNCTION public.calcular_total_provisao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total = NEW.valor_principal + NEW.encargos_inss + NEW.encargos_fgts;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_calcular_total_provisao ON public.provisoes_mensais;
CREATE TRIGGER tr_calcular_total_provisao
BEFORE INSERT OR UPDATE ON public.provisoes_mensais
FOR EACH ROW EXECUTE FUNCTION public.calcular_total_provisao();
