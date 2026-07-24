-- Tabela de Entrevistas
CREATE TABLE IF NOT EXISTS public.recrutamento_entrevistas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidatura_id UUID REFERENCES public.candidaturas(id) ON DELETE CASCADE,
    entrevistador_id UUID REFERENCES auth.users(id),
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    local_link TEXT,
    tipo TEXT CHECK (tipo IN ('presencial', 'remoto', 'telefone')),
    status TEXT DEFAULT 'agendada' CHECK (status IN ('agendada', 'realizada', 'cancelada', 'reagendada')),
    feedback TEXT,
    nota INTEGER CHECK (nota >= 1 AND nota <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Testes Técnicos
CREATE TABLE IF NOT EXISTS public.recrutamento_testes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidatura_id UUID REFERENCES public.candidaturas(id) ON DELETE CASCADE,
    nome_teste TEXT NOT NULL,
    url_teste TEXT,
    data_envio TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    data_entrega TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'enviado' CHECK (status IN ('enviado', 'em_progresso', 'entregue', 'avaliado')),
    nota DECIMAL(4,2),
    comentarios TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Anotações/Histórico
CREATE TABLE IF NOT EXISTS public.recrutamento_anotacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidatura_id UUID REFERENCES public.candidaturas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id),
    anotacao TEXT NOT NULL,
    privada BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.recrutamento_entrevistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recrutamento_testes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recrutamento_anotacoes ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Entrevistas acessíveis por empresa" ON public.recrutamento_entrevistas;
CREATE POLICY "Entrevistas acessíveis por empresa" ON public.recrutamento_entrevistas
    FOR ALL USING (candidatura_id IN (SELECT id FROM public.candidaturas));

DROP POLICY IF EXISTS "Testes acessíveis por empresa" ON public.recrutamento_testes;
CREATE POLICY "Testes acessíveis por empresa" ON public.recrutamento_testes
    FOR ALL USING (candidatura_id IN (SELECT id FROM public.candidaturas));

DROP POLICY IF EXISTS "Anotações acessíveis por empresa" ON public.recrutamento_anotacoes;
CREATE POLICY "Anotações acessíveis por empresa" ON public.recrutamento_anotacoes
    FOR ALL USING (candidatura_id IN (SELECT id FROM public.candidaturas));

-- Triggers de Updated_at
DROP TRIGGER IF EXISTS set_timestamp_recrutamento_entrevistas ON public.recrutamento_entrevistas;
CREATE TRIGGER set_timestamp_recrutamento_entrevistas
BEFORE UPDATE ON public.recrutamento_entrevistas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_recrutamento_testes ON public.recrutamento_testes;
CREATE TRIGGER set_timestamp_recrutamento_testes
BEFORE UPDATE ON public.recrutamento_testes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
