-- Gestão de Metas e OKRs
CREATE TABLE IF NOT EXISTS public.metas_okrs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT CHECK (tipo IN ('individual', 'equipe', 'empresa')),
    valor_objetivo DECIMAL(12,2) DEFAULT 100,
    valor_atual DECIMAL(12,2) DEFAULT 0,
    data_limite DATE,
    status TEXT DEFAULT 'ativo' CHECK (status IN ('rascunho', 'ativo', 'concluido', 'pausado', 'cancelado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Plano de Desenvolvimento Individual (PDI)
CREATE TABLE IF NOT EXISTS public.pdi_plano_desenvolvimento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    competencia_foco TEXT,
    acao_desenvolvimento TEXT,
    prazo DATE,
    status TEXT DEFAULT 'em_andamento' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'cancelado')),
    comentarios TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Biblioteca de Competências
CREATE TABLE IF NOT EXISTS public.competencias_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT, -- tecnica, comportamental
    nivel_esperado INTEGER DEFAULT 3, -- 1-5
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.metas_okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdi_plano_desenvolvimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencias_config ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Metas acessíveis por empresa" ON public.metas_okrs;
CREATE POLICY "Metas acessíveis por empresa" ON public.metas_okrs
    FOR ALL USING (empresa_id IN (SELECT id FROM public.empresas));

DROP POLICY IF EXISTS "PDIs acessíveis por empresa" ON public.pdi_plano_desenvolvimento;
CREATE POLICY "PDIs acessíveis por empresa" ON public.pdi_plano_desenvolvimento
    FOR ALL USING (empresa_id IN (SELECT id FROM public.empresas));

DROP POLICY IF EXISTS "Competências acessíveis por empresa" ON public.competencias_config;
CREATE POLICY "Competências acessíveis por empresa" ON public.competencias_config
    FOR ALL USING (empresa_id IN (SELECT id FROM public.empresas));

-- Gatilhos de Timestamps
DROP TRIGGER IF EXISTS set_timestamp_metas_okrs ON public.metas_okrs;
CREATE TRIGGER set_timestamp_metas_okrs
BEFORE UPDATE ON public.metas_okrs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_pdi_plano ON public.pdi_plano_desenvolvimento;
CREATE TRIGGER set_timestamp_pdi_plano
BEFORE UPDATE ON public.pdi_plano_desenvolvimento
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
