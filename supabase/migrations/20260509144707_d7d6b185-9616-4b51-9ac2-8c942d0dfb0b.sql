-- Create folha_auditoria table
CREATE TABLE IF NOT EXISTS public.folha_auditoria (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    folha_id UUID REFERENCES public.folhas_pagamento(id) ON DELETE CASCADE,
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    tipo_evento TEXT NOT NULL, -- 'CALCULO', 'CONFERENCIA', 'ESOCIAL', 'AJUSTE'
    severidade TEXT NOT NULL DEFAULT 'INFO', -- 'INFO', 'AVISO', 'ERRO', 'CRITICO'
    mensagem TEXT NOT NULL,
    detalhes JSONB DEFAULT '{}'::jsonb,
    criado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.folha_auditoria ENABLE ROW LEVEL SECURITY;

-- Simplified policies for now based on public.profiles structure
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar auditoria" ON public.folha_auditoria;
CREATE POLICY "Usuários autenticados podem visualizar auditoria"
ON public.folha_auditoria
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuários autenticados podem inserir auditoria" ON public.folha_auditoria;
CREATE POLICY "Usuários autenticados podem inserir auditoria"
ON public.folha_auditoria
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_folha_auditoria_folha ON public.folha_auditoria(folha_id);
CREATE INDEX IF NOT EXISTS idx_folha_auditoria_colaborador ON public.folha_auditoria(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_folha_auditoria_created_at ON public.folha_auditoria(created_at);
