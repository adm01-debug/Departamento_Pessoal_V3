-- Migration: create_guias_inss
-- Created at: 2025-12-28T13:16:40+00:00

CREATE TABLE IF NOT EXISTS public.guias_inss (
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
CREATE INDEX IF NOT EXISTS idx_guias_inss_colaborador ON public.guias_inss(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_guias_inss_empresa ON public.guias_inss(empresa_id);
CREATE INDEX IF NOT EXISTS idx_guias_inss_status ON public.guias_inss(status);

-- RLS
ALTER TABLE public.guias_inss ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guias_inss_all" ON public.guias_inss;
CREATE POLICY "guias_inss_all" ON public.guias_inss
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
