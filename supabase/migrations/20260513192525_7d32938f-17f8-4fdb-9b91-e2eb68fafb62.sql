-- 1. Tabela para Registro de Incidentes/Acidentes (NR-1 / NR-7)
CREATE TABLE IF NOT EXISTS public.sst_incidentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL, -- 'quase_acidente', 'acidente_leve', 'acidente_grave', 'doenca_ocupacional'
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    local TEXT NOT NULL,
    gravidade INTEGER CHECK (gravidade BETWEEN 1 AND 5),
    descricao TEXT NOT NULL,
    medidas_tomadas TEXT,
    testemunhas JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'investigacao', -- 'investigacao', 'concluido', 'arquivado'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para Incidentes
ALTER TABLE public.sst_incidentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores e RH gerenciam incidentes" ON public.sst_incidentes;
CREATE POLICY "Gestores e RH gerenciam incidentes"
ON public.sst_incidentes FOR ALL
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'rh', 'gestor')
));

-- 2. Tabela para Programas e Laudos (PGR, PCMSO, LTCAT)
CREATE TABLE IF NOT EXISTS public.sst_programas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    tipo TEXT NOT NULL, -- 'PGR', 'PCMSO', 'LTCAT', 'PPP', 'LTI'
    titulo TEXT NOT NULL,
    data_emissao DATE NOT NULL,
    data_validade DATE NOT NULL,
    responsavel_tecnico TEXT, -- Nome do Engenheiro/Médico
    registro_profissional TEXT, -- CRM/CREA
    arquivo_url TEXT,
    status TEXT DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para Programas
ALTER TABLE public.sst_programas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores veem programas de SST" ON public.sst_programas;
CREATE POLICY "Gestores veem programas de SST"
ON public.sst_programas FOR SELECT
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'rh', 'gestor')
));

-- 3. Tabela para Riscos Ambientais (Mapeamento)
CREATE TABLE IF NOT EXISTS public.sst_riscos_ambientais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    local_id UUID REFERENCES public.locais_trabalho(id) ON DELETE CASCADE,
    categoria TEXT NOT NULL, -- 'Fisico', 'Quimico', 'Biologico', 'Ergonomico', 'Acidente'
    agente TEXT NOT NULL, -- ex: 'Ruído', 'Calor', 'Poeira'
    intensidade_concentracao TEXT,
    limite_tolerancia TEXT,
    tecnica_utilizada TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para Riscos
ALTER TABLE public.sst_riscos_ambientais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso aos riscos da empresa" ON public.sst_riscos_ambientais;
CREATE POLICY "Acesso aos riscos da empresa"
ON public.sst_riscos_ambientais FOR SELECT
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'rh', 'gestor')
));
