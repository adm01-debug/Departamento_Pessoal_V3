-- Migration: create_recibos_rescisao
-- Created at: 2025-12-28T13:16:40+00:00

CREATE TABLE IF NOT EXISTS public.recibos_rescisao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  
  -- Campos específicos
  codigo TEXT,
  descricao TEXT,
  valor DECIMAL(15,2) DEFAULT 0,
  competencia DATE,
  data_geracao TIMESTAMPTZ DEFAULT NOW(),
  data_vencimento DATE,
  status TEXT DEFAULT 'pendente',
  arquivo_url TEXT,
  observacoes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recibos_rescisao_colaborador ON public.recibos_rescisao(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_recibos_rescisao_empresa ON public.recibos_rescisao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_recibos_rescisao_status ON public.recibos_rescisao(status);

-- RLS
ALTER TABLE public.recibos_rescisao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recibos_rescisao_all" ON public.recibos_rescisao;
CREATE POLICY "recibos_rescisao_all" ON public.recibos_rescisao
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
