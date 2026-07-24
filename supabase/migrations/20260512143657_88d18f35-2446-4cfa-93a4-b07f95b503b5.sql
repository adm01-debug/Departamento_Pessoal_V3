-- Biblioteca de Conteúdo (LXP)
CREATE TABLE IF NOT EXISTS public.trilhas_aprendizado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    nivel TEXT CHECK (nivel IN ('basico', 'intermediario', 'avancado')),
    tags TEXT[],
    imagem_capa TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turmas / Instâncias de Treinamento
CREATE TABLE IF NOT EXISTS public.treinamento_instancias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id UUID REFERENCES public.catalogo_cursos(id) ON DELETE CASCADE,
    instrutor_id UUID REFERENCES public.colaboradores(id),
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE,
    local_link TEXT,
    capacidade_maxima INTEGER,
    status TEXT DEFAULT 'planejado' CHECK (status IN ('planejado', 'em_curso', 'concluido', 'cancelado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Feedback e Avaliação de Eficácia
CREATE TABLE IF NOT EXISTS public.treinamento_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inscricao_id UUID REFERENCES public.inscricoes_cursos(id) ON DELETE CASCADE,
    nota_satisfacao INTEGER CHECK (nota_satisfacao >= 1 AND nota_satisfacao <= 5),
    comentario TEXT,
    aplicabilidade_nota INTEGER CHECK (aplicabilidade_nota >= 1 AND aplicabilidade_nota <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.trilhas_aprendizado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treinamento_instancias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treinamento_feedback ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Trilhas acessíveis por empresa" ON public.trilhas_aprendizado;
CREATE POLICY "Trilhas acessíveis por empresa" ON public.trilhas_aprendizado
    FOR ALL USING (empresa_id IN (SELECT id FROM public.empresas));

DROP POLICY IF EXISTS "Instâncias acessíveis por empresa" ON public.treinamento_instancias;
CREATE POLICY "Instâncias acessíveis por empresa" ON public.treinamento_instancias
    FOR ALL USING (true); -- Ajustado via join na app

CREATE POLICY "Feedbacks acessíveis por inscrição" ON public.treinamento_feedback
    FOR ALL USING (true);

-- Triggers
DROP TRIGGER IF EXISTS set_timestamp_trilhas ON public.trilhas_aprendizado;
CREATE TRIGGER set_timestamp_trilhas
BEFORE UPDATE ON public.trilhas_aprendizado
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_instancias ON public.treinamento_instancias;
CREATE TRIGGER set_timestamp_instancias
BEFORE UPDATE ON public.treinamento_instancias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
