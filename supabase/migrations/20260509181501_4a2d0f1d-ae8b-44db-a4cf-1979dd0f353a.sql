-- Tabela de Pendências para o Dashboard
CREATE TABLE IF NOT EXISTS public.pendencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'ferias', 'assinaturas', 'ponto', 'documentos'
    titulo TEXT NOT NULL,
    descricao TEXT,
    referencia_id UUID,
    prioridade TEXT DEFAULT 'media',
    status TEXT DEFAULT 'pendente',
    metadata JSONB DEFAULT '{}'::jsonb,
    criado_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.pendencias ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
-- Simplificando ao máximo para evitar erro de coluna
DROP POLICY IF EXISTS "view_pendencias" ON public.pendencias;
CREATE POLICY "view_pendencias" ON public.pendencias FOR SELECT USING (true);
DROP POLICY IF EXISTS "manage_pendencias" ON public.pendencias;
CREATE POLICY "manage_pendencias" ON public.pendencias FOR ALL USING (true);

-- Tabela de Auditoria para Timeline Real-time
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id),
    tabela TEXT NOT NULL,
    registro_id UUID,
    acao TEXT NOT NULL,
    dados_antigos JSONB,
    dados_novos JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "view_audit" ON public.audit_log;
CREATE POLICY "view_audit" ON public.audit_log FOR SELECT USING (true);

-- Função para automatizar o log de auditoria
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_log (empresa_id, usuario_id, tabela, registro_id, acao, dados_antigos, dados_novos)
    VALUES (
        (CASE WHEN TG_OP = 'DELETE' THEN OLD.empresa_id ELSE NEW.empresa_id END),
        auth.uid(),
        TG_TABLE_NAME,
        (CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END),
        TG_OP,
        (CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END),
        (CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END)
    );
    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
DO $$
BEGIN
    DROP TRIGGER IF EXISTS tr_audit_colaboradores ON public.colaboradores;
    CREATE TRIGGER tr_audit_colaboradores AFTER INSERT OR UPDATE OR DELETE ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
END $$;
