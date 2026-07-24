-- Tabela de Provisões Mensais
CREATE TABLE IF NOT EXISTS public.provisoes_mensais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    competencia TEXT NOT NULL, -- formato YYYY-MM
    tipo TEXT NOT NULL CHECK (tipo IN ('ferias', '13_salario')),
    valor_principal DECIMAL(15,2) NOT NULL DEFAULT 0,
    encargos_inss DECIMAL(15,2) NOT NULL DEFAULT 0,
    encargos_fgts DECIMAL(15,2) NOT NULL DEFAULT 0,
    total DECIMAL(15,2) GENERATED ALWAYS AS (valor_principal + encargos_inss + encargos_fgts) STORED,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_provisoes_empresa_competencia ON public.provisoes_mensais(empresa_id, competencia);
CREATE INDEX IF NOT EXISTS idx_provisoes_colaborador ON public.provisoes_mensais(colaborador_id);

-- RLS
ALTER TABLE public.provisoes_mensais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view provisoes of their companies" ON public.provisoes_mensais;
CREATE POLICY "Users can view provisoes of their companies"
ON public.provisoes_mensais
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_empresas
        WHERE user_empresas.empresa_id = provisoes_mensais.empresa_id
        AND user_empresas.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can manage provisoes of their companies" ON public.provisoes_mensais;
CREATE POLICY "Users can manage provisoes of their companies"
ON public.provisoes_mensais
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_empresas
        WHERE user_empresas.empresa_id = provisoes_mensais.empresa_id
        AND user_empresas.user_id = auth.uid()
    )
);

-- Trigger para updated_at (assumindo que a function update_updated_at_column existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_provisoes_updated_at
        BEFORE UPDATE ON public.provisoes_mensais
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
