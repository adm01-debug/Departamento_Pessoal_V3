-- Tabela de Regras de Elegibilidade
CREATE TABLE IF NOT EXISTS public.beneficio_regras_elegibilidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficio_id UUID REFERENCES public.beneficios(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    cargo_id UUID REFERENCES public.cargos(id),
    departamento_id UUID REFERENCES public.departamentos(id),
    tempo_casa_minimo INTEGER DEFAULT 0, -- meses
    automatico BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Movimentações de Benefícios (Histórico)
CREATE TABLE IF NOT EXISTS public.beneficio_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    beneficio_id UUID REFERENCES public.beneficios(id) ON DELETE CASCADE,
    tipo_movimentacao TEXT NOT NULL CHECK (tipo_movimentacao IN ('adesao', 'exclusao', 'alteracao')),
    data_movimentacao DATE DEFAULT CURRENT_DATE,
    motivo TEXT,
    usuario_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Arquivos/Comprovantes de Benefícios
CREATE TABLE IF NOT EXISTS public.beneficio_arquivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficio_id UUID REFERENCES public.beneficios(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    url TEXT NOT NULL,
    tipo_arquivo TEXT, -- faturas, termos, etc
    periodo_referencia DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.beneficio_regras_elegibilidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficio_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficio_arquivos ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Regras acessíveis por empresa" ON public.beneficio_regras_elegibilidade;
CREATE POLICY "Regras acessíveis por empresa" ON public.beneficio_regras_elegibilidade
    FOR ALL USING (empresa_id IN (SELECT id FROM public.empresas));

DROP POLICY IF EXISTS "Movimentações acessíveis por empresa" ON public.beneficio_movimentacoes;
CREATE POLICY "Movimentações acessíveis por empresa" ON public.beneficio_movimentacoes
    FOR ALL USING (colaborador_id IN (SELECT id FROM public.colaboradores));

DROP POLICY IF EXISTS "Arquivos acessíveis por empresa" ON public.beneficio_arquivos;
CREATE POLICY "Arquivos acessíveis por empresa" ON public.beneficio_arquivos
    FOR ALL USING (empresa_id IN (SELECT id FROM public.empresas));

-- Triggers de Updated_at
DROP TRIGGER IF EXISTS set_timestamp_beneficio_regras ON public.beneficio_regras_elegibilidade;
CREATE TRIGGER set_timestamp_beneficio_regras
BEFORE UPDATE ON public.beneficio_regras_elegibilidade
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
