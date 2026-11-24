-- Tabela para registro de assinaturas digitais de fechamento de folha
CREATE TABLE IF NOT EXISTS public.folha_assinaturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folha_id UUID REFERENCES public.folhas_pagamento(id) ON DELETE CASCADE,
    assinante_id UUID REFERENCES auth.users(id),
    data_assinatura TIMESTAMP WITH TIME ZONE DEFAULT now(),
    cargo_assinante TEXT,
    hash_documento TEXT, -- Hash SHA-256 do estado da folha no momento da assinatura
    ip_assinatura TEXT,
    status TEXT DEFAULT 'valido',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar colunas de controle em holerites
ALTER TABLE public.holerites
ADD COLUMN IF NOT EXISTS hash_validacao TEXT,
ADD COLUMN IF NOT EXISTS data_visualizacao TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ip_visualizacao TEXT;

-- Garantir RLS em holerites
ALTER TABLE public.holerites ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Colaboradores podem ver seus próprios holerites') THEN
        CREATE POLICY "Colaboradores podem ver seus próprios holerites" 
        ON public.holerites 
        FOR SELECT 
        USING (auth.uid() = colaborador_id);
    END IF;
END $$;

-- Função para impedir alterações em folha fechada
CREATE OR REPLACE FUNCTION public.impedir_alteracao_folha_fechada()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status = 'fechada' AND NEW.status = 'fechada' AND (OLD.* IS DISTINCT FROM NEW.*)) THEN
        -- Permitir apenas alteração de metadados de sistema se necessário, ou bloquear tudo
        RAISE EXCEPTION 'Não é permitido alterar uma folha de pagamento que já foi fechada e auditada.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para proteger a folha
DROP TRIGGER IF EXISTS trigger_protecao_folha_fechada ON public.folhas_pagamento;
CREATE TRIGGER trigger_protecao_folha_fechada
BEFORE UPDATE ON public.folhas_pagamento
FOR EACH ROW
EXECUTE FUNCTION public.impedir_alteracao_folha_fechada();

-- Log de auditoria detalhado para a folha
CREATE TABLE IF NOT EXISTS public.folha_eventos_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folha_id UUID REFERENCES public.folhas_pagamento(id),
    usuario_id UUID REFERENCES auth.users(id),
    tipo_evento TEXT, -- 'CALCULO', 'RECALCULO', 'FECHAMENTO', 'ESTORNO', 'ENVIO_ESOCIAL'
    detalhes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
