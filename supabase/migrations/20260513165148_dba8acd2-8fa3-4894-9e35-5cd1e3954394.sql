-- Tabela de configuração de workflows
CREATE TABLE IF NOT EXISTS public.workflows_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id),
    evento_tipo TEXT NOT NULL, -- 'nova_admissao', 'desligamento', 'aniversario', etc.
    acao_tipo TEXT NOT NULL, -- 'notificacao', 'email', 'whatsapp', 'tarefa'
    configuracao JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Função para processar workflow de nova admissão
CREATE OR REPLACE FUNCTION public.fn_processar_workflow_admissao()
RETURNS TRIGGER AS $$
DECLARE
    r_config RECORD;
BEGIN
    -- Busca configurações ativas para nova admissão
    FOR r_config IN (SELECT * FROM workflows_config WHERE evento_tipo = 'nova_admissao' AND empresa_id = NEW.empresa_id AND ativo = true) LOOP
        
        -- Ação: Notificação no Sistema
        IF r_config.acao_tipo = 'notificacao' THEN
            INSERT INTO public.notificacoes (
                titulo,
                mensagem,
                tipo,
                empresa_id,
                user_id, -- Notifica o RH (aqui poderíamos buscar usuários com role RH)
                entidade_tipo,
                entidade_id
            ) VALUES (
                'Nova Admissão Iniciada',
                'O processo de admissão para ' || COALESCE(NEW.nome_completo, 'novo colaborador') || ' foi iniciado.',
                'info',
                NEW.empresa_id,
                (SELECT id FROM profiles WHERE empresa_id = NEW.empresa_id LIMIT 1), -- Simplificação: notifica o primeiro user da empresa
                'admissao',
                NEW.id
            );
        END IF;

        -- Ação: Criar Tarefa (se houver tabela de tarefas, aqui usamos como exemplo)
        -- INSERT INTO tarefas ...
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para admissões
DROP TRIGGER IF EXISTS trg_workflow_admissao ON public.admissoes;
CREATE TRIGGER trg_workflow_admissao
AFTER INSERT ON public.admissoes
FOR EACH ROW EXECUTE FUNCTION public.fn_processar_workflow_admissao();

-- Enable RLS
ALTER TABLE public.workflows_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their company workflows" ON public.workflows_config;
CREATE POLICY "Users can view their company workflows" ON public.workflows_config FOR SELECT USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "Users can manage their company workflows" ON public.workflows_config;
CREATE POLICY "Users can manage their company workflows" ON public.workflows_config FOR ALL USING (empresa_id IN (SELECT empresa_id FROM profiles WHERE id = auth.uid()));
