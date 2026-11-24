-- Adicionar colunas de controle financeiro e legal na tabela de benefícios
ALTER TABLE public.beneficios 
ADD COLUMN IF NOT EXISTS teto_coparticipacao NUMERIC, -- Limite máximo de desconto do colaborador
ADD COLUMN IF NOT EXISTS percentual_subsidio_empresa NUMERIC DEFAULT 100,
ADD COLUMN IF NOT EXISTS carencia_dias INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS exige_anexo_comprovante BOOLEAN DEFAULT false;

-- Adicionar controle de integridade em adesões
ALTER TABLE public.beneficios_colaborador
ADD COLUMN IF NOT EXISTS hash_autorizacao TEXT, -- Hash da assinatura do colaborador aceitando o benefício
ADD COLUMN IF NOT EXISTS ip_adesao TEXT,
ADD COLUMN IF NOT EXISTS data_validacao_rh TIMESTAMP WITH TIME ZONE;

-- Tabela para registro de uso de convênios/benefícios (extrato)
CREATE TABLE IF NOT EXISTS public.beneficio_utilizacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficio_colaborador_id UUID REFERENCES public.beneficios_colaborador(id) ON DELETE CASCADE,
    data_uso TIMESTAMP WITH TIME ZONE DEFAULT now(),
    valor_total NUMERIC NOT NULL,
    valor_desconto_folha NUMERIC,
    estabelecimento TEXT,
    protocolo_autorizacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS no extrato de uso
ALTER TABLE public.beneficio_utilizacao ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Colaboradores podem ver seu próprio extrato de benefícios') THEN
        CREATE POLICY "Colaboradores podem ver seu próprio extrato de benefícios" 
        ON public.beneficio_utilizacao 
        FOR SELECT 
        USING (
            EXISTS (
                SELECT 1 FROM public.beneficios_colaborador bc
                JOIN public.colaboradores c ON bc.colaborador_id = c.id
                WHERE bc.id = beneficio_utilizacao.beneficio_colaborador_id
                AND auth.uid() = c.id
            )
        );
    END IF;
END $$;

-- Função para validar exclusão de benefícios obrigatórios
CREATE OR REPLACE FUNCTION public.validar_suspensao_beneficio_obrigatorio()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.obrigatorio_por_lei = true AND NEW.ativo = false) THEN
        RAISE EXCEPTION 'Não é permitido desativar benefícios obrigatórios por lei sem a devida justificativa legal e anexo de dispensa assinado pelo colaborador.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger de proteção legal
DROP TRIGGER IF EXISTS trigger_protecao_beneficio_lei ON public.beneficios;
CREATE TRIGGER trigger_protecao_beneficio_lei
BEFORE UPDATE ON public.beneficios
FOR EACH ROW
WHEN (OLD.ativo IS DISTINCT FROM NEW.ativo)
EXECUTE FUNCTION public.validar_suspensao_beneficio_obrigatorio();
