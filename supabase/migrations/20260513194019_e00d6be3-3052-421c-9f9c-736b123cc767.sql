-- Adicionar colunas de controle eSocial na tabela de admissões
ALTER TABLE public.admissoes 
ADD COLUMN IF NOT EXISTS status_esocial TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS protocolo_esocial TEXT,
ADD COLUMN IF NOT EXISTS data_transmissao_esocial TIMESTAMP WITH TIME ZONE;

-- Adicionar controle de validade e integridade em documentos
ALTER TABLE public.documentos_assinatura 
ADD COLUMN IF NOT EXISTS validade_assinatura TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ip_assinatura TEXT;

ALTER TABLE public.documentos_colaborador
ADD COLUMN IF NOT EXISTS hash_validacao TEXT,
ADD COLUMN IF NOT EXISTS verificado_ia BOOLEAN DEFAULT false;

-- Habilitar RLS para candidatos (usando o token de admissão se aplicável, ou auth.uid)
ALTER TABLE public.documentos_colaborador ENABLE ROW LEVEL SECURITY;

-- Política para que o colaborador veja seus próprios documentos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Colaboradores podem ver seus próprios documentos') THEN
        CREATE POLICY "Colaboradores podem ver seus próprios documentos" 
        ON public.documentos_colaborador 
        FOR SELECT 
        USING (auth.uid() = colaborador_id);
    END IF;
END $$;

-- Criar tabela de histórico de alterações contratuais para auditoria se não existir
CREATE TABLE IF NOT EXISTS public.auditoria_contratual (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID REFERENCES public.colaboradores(id),
    campo_alterado TEXT,
    valor_antigo TEXT,
    valor_novo TEXT,
    alterado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Função para registrar log de auditoria
CREATE OR REPLACE FUNCTION public.registrar_auditoria_contratual()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.salario_proposto IS DISTINCT FROM NEW.salario_proposto) THEN
        INSERT INTO public.auditoria_contratual (colaborador_id, campo_alterado, valor_antigo, valor_novo, alterado_por)
        VALUES (NEW.id, 'salario', OLD.salario_proposto::text, NEW.salario_proposto::text, auth.uid());
    END IF;
    -- Adicionar outros campos conforme necessário
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auditoria na tabela de admissões
DROP TRIGGER IF EXISTS trigger_auditoria_admissao ON public.admissoes;
CREATE TRIGGER trigger_auditoria_admissao
BEFORE UPDATE ON public.admissoes
FOR EACH ROW
EXECUTE FUNCTION public.registrar_auditoria_contratual();
