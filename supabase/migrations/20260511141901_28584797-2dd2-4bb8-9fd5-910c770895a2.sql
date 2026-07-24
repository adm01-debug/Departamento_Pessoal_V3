-- Tabela para histórico de snapshots de cálculos
CREATE TABLE IF NOT EXISTS public.historico_calculos_folha (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folha_id UUID REFERENCES public.folhas_pagamento(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    snapshot JSONB NOT NULL,
    criado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.historico_calculos_folha ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso por empresa historico" ON public.historico_calculos_folha;
CREATE POLICY "Acesso por empresa historico" 
ON public.historico_calculos_folha FOR SELECT 
TO authenticated
USING (empresa_id::uuid = (auth.jwt()->>'empresa_id')::uuid);

DROP POLICY IF EXISTS "Inserção por empresa historico" ON public.historico_calculos_folha;
CREATE POLICY "Inserção por empresa historico" 
ON public.historico_calculos_folha FOR INSERT 
TO authenticated
WITH CHECK (empresa_id::uuid = (auth.jwt()->>'empresa_id')::uuid);