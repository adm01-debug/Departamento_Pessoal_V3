-- Tabela de Auditoria para Premiações
CREATE TABLE IF NOT EXISTS public.premiacoes_auditoria (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    entidade_tipo TEXT NOT NULL, -- 'campanha', 'regra', 'pagamento'
    entidade_id UUID NOT NULL,
    usuario_id UUID REFERENCES auth.users(id),
    acao TEXT NOT NULL, -- 'criacao', 'alteracao', 'aprovacao', 'calculo'
    dados_anteriores JSONB,
    dados_novos JSONB,
    motivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na auditoria
ALTER TABLE public.premiacoes_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários autenticados podem ver auditoria de premiações" ON public.premiacoes_auditoria;
CREATE POLICY "Usuários autenticados podem ver auditoria de premiações"
ON public.premiacoes_auditoria FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Adicionar campos de integração com folha na tabela de pagamentos
ALTER TABLE public.premiacoes_pagamentos 
ADD COLUMN IF NOT EXISTS integrado_folha BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_integracao TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS referencia_folha TEXT; -- Mes/Ano de referencia (ex: '2026-05')

-- Adicionar campos para cenários no simulador
CREATE TABLE IF NOT EXISTS public.premiacoes_cenarios_simulacao (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    configuracoes JSONB NOT NULL,
    criado_por UUID REFERENCES auth.users(id),
    empresa_id UUID REFERENCES public.empresas(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.premiacoes_cenarios_simulacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seus próprios cenários de simulação" ON public.premiacoes_cenarios_simulacao;
CREATE POLICY "Usuários podem ver seus próprios cenários de simulação"
ON public.premiacoes_cenarios_simulacao FOR SELECT
USING (auth.uid() = criado_por);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_premiacoes_auditoria_entidade ON public.premiacoes_auditoria(entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_premiacoes_pagamentos_folha ON public.premiacoes_pagamentos(integrado_folha, referencia_folha);
