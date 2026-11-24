-- Adicionar colunas de controle jurídico e auditoria na tabela de batidas
ALTER TABLE public.batidas_ponto 
ADD COLUMN IF NOT EXISTS hash_comprovante TEXT, -- Hash SHA-256 para o comprovante do trabalhador
ADD COLUMN IF NOT EXISTS id_fiscal_ponto TEXT, -- ID único conforme Portaria 671
ADD COLUMN IF NOT EXISTS distancia_local_metros NUMERIC,
ADD COLUMN IF NOT EXISTS anomalia_detectada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS justificativa_anomalia TEXT;

-- Tabela para formalização do Espelho de Ponto Mensal
CREATE TABLE IF NOT EXISTS public.ponto_espelhos_assinados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID REFERENCES public.colaboradores(id),
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    total_horas_trabalhadas INTERVAL,
    saldo_banco_horas_periodo INTERVAL,
    hash_assinatura_colaborador TEXT,
    data_assinatura_colaborador TIMESTAMP WITH TIME ZONE,
    hash_assinatura_rh TEXT,
    data_assinatura_rh TIMESTAMP WITH TIME ZONE,
    status_assinatura TEXT DEFAULT 'pendente', -- 'pendente', 'assinado_colaborador', 'concluido'
    arquivo_espelho_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS no espelho assinado
ALTER TABLE public.ponto_espelhos_assinados ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Colaboradores podem ver seus próprios espelhos') THEN
        CREATE POLICY "Colaboradores podem ver seus próprios espelhos" 
        ON public.ponto_espelhos_assinados 
        FOR SELECT 
        USING (auth.uid() = colaborador_id);
    END IF;
END $$;

-- Trilha de auditoria específica para auditoria de fraude em GPS/Tempo
CREATE TABLE IF NOT EXISTS public.ponto_auditoria_fraude (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batida_id UUID REFERENCES public.batidas_ponto(id),
    tipo_alerta TEXT, -- 'GPS_SPOOFING', 'IMPOSSIBLE_TRAVEL', 'TIME_MANIPULATION'
    score_confianca NUMERIC,
    detalhes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Função para garantir imutabilidade dos registros de ponto
CREATE OR REPLACE FUNCTION public.proibir_delete_ponto()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Registros de ponto não podem ser deletados por exigência legal (Portaria 671). Use o fluxo de ajuste auditado.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger de imutabilidade
DROP TRIGGER IF EXISTS trigger_imutabilidade_ponto ON public.batidas_ponto;
CREATE TRIGGER trigger_imutabilidade_ponto
BEFORE DELETE ON public.batidas_ponto
FOR EACH ROW
EXECUTE FUNCTION public.proibir_delete_ponto();
