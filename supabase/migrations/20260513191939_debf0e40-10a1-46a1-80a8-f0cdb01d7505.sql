-- 1. Tabela para Documentos de Admissão (Real)
CREATE TABLE IF NOT EXISTS public.documentos_admissao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admissao_id UUID REFERENCES public.admissoes(id) ON DELETE CASCADE,
    tipo_documento TEXT NOT NULL, -- 'RG', 'CPF', 'COMPROVANTE_RESIDENCIA', 'PIS', 'ASO'
    storage_path TEXT NOT NULL,
    status TEXT DEFAULT 'pendente', -- 'pendente', 'em_analise', 'aprovado', 'rejeitado'
    motivo_rejeicao TEXT,
    validado_por UUID REFERENCES auth.users(id),
    validado_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.documentos_admissao ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Gestores veem documentos de admissão" ON public.documentos_admissao;
CREATE POLICY "Gestores veem documentos de admissão"
ON public.documentos_admissao FOR SELECT
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'rh', 'gestor')
));

-- 2. Tabela de Kits de Onboarding (Assets)
CREATE TABLE IF NOT EXISTS public.onboarding_kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    nome TEXT NOT NULL, -- 'Kit Desenvolvedor', 'Kit Administrativo'
    itens JSONB NOT NULL DEFAULT '[]'::jsonb, -- ['Notebook', 'Fone', 'Mochila', 'Caderno']
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Tabela de Tarefas de Onboarding
CREATE TABLE IF NOT EXISTS public.tarefas_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admissao_id UUID REFERENCES public.admissoes(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    responsavel_id UUID REFERENCES auth.users(id),
    prazo_dias INTEGER DEFAULT 5, -- dias após admissão
    concluida BOOLEAN DEFAULT false,
    concluida_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.tarefas_onboarding ENABLE ROW LEVEL SECURITY;

-- 4. Função para atualizar checklist automaticamente ao aprovar documento
CREATE OR REPLACE FUNCTION public.fn_update_admissao_checklist()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'aprovado' AND OLD.status != 'aprovado') THEN
        IF (NEW.tipo_documento = 'RG' OR NEW.tipo_documento = 'CPF') THEN
            UPDATE public.admissoes SET checklist_documentos_pessoais = true WHERE id = NEW.admissao_id;
        ELSIF (NEW.tipo_documento = 'COMPROVANTE_RESIDENCIA') THEN
            UPDATE public.admissoes SET checklist_comprovante_endereco = true WHERE id = NEW.admissao_id;
        ELSIF (NEW.tipo_documento = 'ASO') THEN
            UPDATE public.admissoes SET checklist_exame_admissional = true WHERE id = NEW.admissao_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS tr_update_admissao_checklist ON public.documentos_admissao;
CREATE TRIGGER tr_update_admissao_checklist
AFTER UPDATE ON public.documentos_admissao
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_admissao_checklist();

-- 5. Criar tarefas padrão ao criar nova admissão
CREATE OR REPLACE FUNCTION public.fn_create_default_onboarding_tasks()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.tarefas_onboarding (admissao_id, titulo, descricao)
    VALUES 
    (NEW.id, 'Configuração de E-mail', 'Criar conta corporativa no Google/Outlook'),
    (NEW.id, 'Acessos ao Sistema', 'Liberar ERP e ferramentas de comunicação'),
    (NEW.id, 'Entrega de Kit', 'Notebook e kit de boas-vindas');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_create_onboarding_tasks ON public.admissoes;
CREATE TRIGGER tr_create_onboarding_tasks
AFTER INSERT ON public.admissoes
FOR EACH ROW
EXECUTE FUNCTION public.fn_create_default_onboarding_tasks();
