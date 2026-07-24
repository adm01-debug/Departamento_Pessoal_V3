CREATE TABLE IF NOT EXISTS public.ponto_regras_aprovacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    tipo_solicitacao TEXT NOT NULL, -- 'AJUSTE', 'ABONO', 'HORA_EXTRA'
    niveis_aprovacao INTEGER DEFAULT 1,
    sla_horas INTEGER DEFAULT 48, -- SLA em horas para decisão
    exige_anexo BOOLEAN DEFAULT false,
    limite_mensal_solicitacoes INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.ponto_ajustes ADD COLUMN IF NOT EXISTS sla_vencimento TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ponto_ajustes ADD COLUMN IF NOT EXISTS nivel_aprovacao_atual INTEGER DEFAULT 1;
ALTER TABLE public.ponto_ajustes ADD COLUMN IF NOT EXISTS historico_aprovacao JSONB DEFAULT '[]'::jsonb;

-- Política de RLS para regras
ALTER TABLE public.ponto_regras_aprovacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestores podem gerenciar regras" ON public.ponto_regras_aprovacao;
CREATE POLICY "Gestores podem gerenciar regras" ON public.ponto_regras_aprovacao FOR ALL USING (true);
