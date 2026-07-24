-- Adicionar campos de fluxo de aprovação e comentários para campanhas
ALTER TABLE public.premiacoes_campanhas 
ADD COLUMN IF NOT EXISTS status_aprovacao TEXT DEFAULT 'rascunho' CHECK (status_aprovacao IN ('rascunho', 'revisando', 'aprovado', 'rejeitado')),
ADD COLUMN IF NOT EXISTS comentarios_aprovacao JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS meta_dados JSONB DEFAULT '{}';

-- Adicionar campos de conciliação e comentários para pagamentos
ALTER TABLE public.premiacoes_pagamentos
ADD COLUMN IF NOT EXISTS status_conciliacao TEXT DEFAULT 'pendente' CHECK (status_conciliacao IN ('pendente', 'conciliado', 'divergente')),
ADD COLUMN IF NOT EXISTS valor_folha_real DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS justificativa_divergencia TEXT,
ADD COLUMN IF NOT EXISTS logs_calculo JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS historico_mudancas JSONB DEFAULT '[]';

-- Tabela para cenários salvos do simulador de ROI
CREATE TABLE IF NOT EXISTS public.premiacoes_roi_cenarios (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    nome TEXT NOT NULL,
    configuracoes JSONB NOT NULL,
    resultados JSONB NOT NULL,
    snapshot_logs JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.premiacoes_roi_cenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own scenarios" ON public.premiacoes_roi_cenarios;
CREATE POLICY "Users can manage their own scenarios" 
ON public.premiacoes_roi_cenarios 
FOR ALL 
USING (auth.uid() = user_id);

-- Tabela para notificações e alertas críticos
CREATE TABLE IF NOT EXISTS public.premiacoes_alertas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo TEXT NOT NULL, -- 'finalizado', 'pagamento_pendente', 'divergencia_auditoria'
    mensagem TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    lido BOOLEAN DEFAULT false,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.premiacoes_alertas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own alerts" ON public.premiacoes_alertas;
CREATE POLICY "Users can view their own alerts" 
ON public.premiacoes_alertas 
FOR SELECT 
USING (auth.uid() = user_id);
