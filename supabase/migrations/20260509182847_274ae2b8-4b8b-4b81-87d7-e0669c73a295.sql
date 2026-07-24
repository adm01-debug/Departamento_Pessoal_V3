-- Tabela de Auditoria de Férias
CREATE TABLE IF NOT EXISTS public.ferias_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id),
    entidade_tipo TEXT NOT NULL, -- 'solicitacao', 'periodo_aquisitivo'
    entidade_id UUID NOT NULL,
    acao TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'APPROVE_GESTOR', 'APPROVE_RH', 'REJECT'
    dados_anteriores JSONB,
    dados_novos JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.ferias_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View ferias audit by company" ON public.ferias_audit_log;
CREATE POLICY "View ferias audit by company" ON public.ferias_audit_log
FOR SELECT USING (empresa_id IN (SELECT id FROM empresas));

-- Função para registrar auditoria de férias
CREATE OR REPLACE FUNCTION public.process_ferias_audit()
RETURNS TRIGGER AS $$
DECLARE
    v_empresa_id UUID;
    v_acao TEXT;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_empresa_id := OLD.empresa_id;
        v_acao := 'DELETE';
    ELSE
        v_empresa_id := NEW.empresa_id;
        IF (TG_OP = 'INSERT') THEN
            v_acao := 'CREATE';
        ELSE
            v_acao := 'UPDATE';
            -- Detecção específica de aprovação
            IF (TG_TABLE_NAME = 'ferias_solicitacoes') THEN
                IF (OLD.status_gestor <> NEW.status_gestor AND NEW.status_gestor = 'aprovado') THEN
                    v_acao := 'APPROVE_GESTOR';
                ELSIF (OLD.status_rh <> NEW.status_rh AND NEW.status_rh = 'aprovado') THEN
                    v_acao := 'APPROVE_RH';
                ELSIF (OLD.status <> NEW.status AND NEW.status = 'rejeitado') THEN
                    v_acao := 'REJECT';
                END IF;
            END IF;
        END IF;
    END IF;

    INSERT INTO public.ferias_audit_log (
        empresa_id, 
        usuario_id, 
        entidade_tipo, 
        entidade_id, 
        acao, 
        dados_anteriores, 
        dados_novos
    )
    VALUES (
        v_empresa_id,
        auth.uid(),
        TG_TABLE_NAME,
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        v_acao,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
    );
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers para Férias
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ferias_solicitacoes') THEN
        DROP TRIGGER IF EXISTS tr_audit_ferias_solicitacoes ON public.ferias_solicitacoes;
        CREATE TRIGGER tr_audit_ferias_solicitacoes
        AFTER INSERT OR UPDATE OR DELETE ON public.ferias_solicitacoes
        FOR EACH ROW EXECUTE FUNCTION public.process_ferias_audit();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'periodos_aquisitivos') THEN
        DROP TRIGGER IF EXISTS tr_audit_periodos_aquisitivos ON public.periodos_aquisitivos;
        CREATE TRIGGER tr_audit_periodos_aquisitivos
        AFTER INSERT OR UPDATE OR DELETE ON public.periodos_aquisitivos
        FOR EACH ROW EXECUTE FUNCTION public.process_ferias_audit();
    END IF;
END $$;
