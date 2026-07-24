-- Tabela de Templates de Documentos
CREATE TABLE IF NOT EXISTS public.documento_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    conteudo_html TEXT,
    categoria TEXT,
    tags TEXT[],
    versao TEXT DEFAULT '1.0.0',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Histórico de Documentos (Versões)
CREATE TABLE IF NOT EXISTS public.documentos_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id UUID REFERENCES public.documentos(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id),
    versao TEXT NOT NULL,
    url_arquivo TEXT NOT NULL,
    tamanho INTEGER,
    alteracoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Assinaturas Digitais (Específica)
CREATE TABLE IF NOT EXISTS public.documentos_assinatura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id UUID REFERENCES public.documentos(id) ON DELETE CASCADE,
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    token_assinatura TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'assinado', 'recusado', 'expirado')),
    data_expiracao TIMESTAMP WITH TIME ZONE,
    assinado_em TIMESTAMP WITH TIME ZONE,
    ip_assinatura TEXT,
    userAgent_assinatura TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.documento_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_assinatura ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Templates acessíveis por empresa" ON public.documento_templates;
CREATE POLICY "Templates acessíveis por empresa" ON public.documento_templates
    FOR ALL USING (empresa_id IS NULL OR empresa_id IN (SELECT id FROM public.empresas));

DROP POLICY IF EXISTS "Histórico acessível por documento" ON public.documentos_historico;
CREATE POLICY "Histórico acessível por documento" ON public.documentos_historico
    FOR ALL USING (true); -- Ajustado via trigger/app logic

CREATE POLICY "Assinaturas acessíveis por empresa" ON public.documentos_assinatura
    FOR ALL USING (empresa_id IN (SELECT id FROM public.empresas));

-- Triggers de Updated_at
DROP TRIGGER IF EXISTS set_timestamp_documento_templates ON public.documento_templates;
CREATE TRIGGER set_timestamp_documento_templates
BEFORE UPDATE ON public.documento_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_timestamp_documentos_assinatura ON public.documentos_assinatura;
CREATE TRIGGER set_timestamp_documentos_assinatura
BEFORE UPDATE ON public.documentos_assinatura
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
