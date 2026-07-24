-- Atualização da tabela de solicitações de ajuste de ponto para workflow formal
ALTER TABLE public.solicitacoes_ajuste_ponto 
ADD COLUMN IF NOT EXISTS rascunho BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_analise TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS analisado_por UUID REFERENCES auth.users(id);

-- Garantir que o status tenha os valores corretos
ALTER TABLE public.solicitacoes_ajuste_ponto 
DROP CONSTRAINT IF EXISTS check_status_ajuste;

ALTER TABLE public.solicitacoes_ajuste_ponto 
ADD CONSTRAINT check_status_ajuste 
CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'recusado'));

-- Tabela para logs de conformidade (Portaria 671)
CREATE TABLE IF NOT EXISTS public.conformidade_ponto_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    batida_id UUID REFERENCES public.batidas_ponto(id) ON DELETE CASCADE,
    tipo_alerta TEXT NOT NULL, -- 'geofencing', 'timezone', 'integridade', 'duplicidade'
    descricao TEXT,
    severidade TEXT DEFAULT 'media', -- 'baixa', 'media', 'alta'
    resolvido BOOLEAN DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.conformidade_ponto_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View logs by company" ON public.conformidade_ponto_logs;
CREATE POLICY "View logs by company" ON public.conformidade_ponto_logs
FOR SELECT USING (empresa_id IN (SELECT id FROM empresas));

-- Função para validar batida de ponto (Conformidade 671)
CREATE OR REPLACE FUNCTION public.validate_ponto_compliance()
RETURNS TRIGGER AS $$
DECLARE
    v_config RECORD;
BEGIN
    -- Busca configurações da empresa
    SELECT * INTO v_config FROM public.configuracoes_ponto WHERE empresa_id = NEW.empresa_id LIMIT 1;

    -- 1. Validação de Integridade (Hash SHA256)
    -- O hash deve ser validado no backend se houver segredo, aqui apenas checamos presença
    IF NEW.hash_integridade IS NULL THEN
        INSERT INTO public.conformidade_ponto_logs (empresa_id, batida_id, tipo_alerta, descricao, severidade)
        VALUES (NEW.empresa_id, NEW.id, 'integridade', 'Batida sem hash de integridade gerado.', 'alta');
    END IF;

    -- 2. Validação de Geofencing (se ativo)
    IF NEW.dentro_raio = false THEN
        INSERT INTO public.conformidade_ponto_logs (empresa_id, batida_id, tipo_alerta, descricao, severidade)
        VALUES (NEW.empresa_id, NEW.id, 'geofencing', 'Colaborador registrou ponto fora do raio permitido.', 'media');
    END IF;

    -- 3. Validação de Timezone Divergente
    IF NEW.timezone IS NOT NULL AND NEW.timezone <> 'America/Sao_Paulo' THEN -- Exemplo, ideal buscar da empresa
         INSERT INTO public.conformidade_ponto_logs (empresa_id, batida_id, tipo_alerta, descricao, severidade)
        VALUES (NEW.empresa_id, NEW.id, 'timezone', 'Timezone divergente detectado: ' || NEW.timezone, 'baixa');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_validate_ponto ON public.batidas_ponto;
CREATE TRIGGER tr_validate_ponto
AFTER INSERT ON public.batidas_ponto
FOR EACH ROW EXECUTE FUNCTION public.validate_ponto_compliance();
