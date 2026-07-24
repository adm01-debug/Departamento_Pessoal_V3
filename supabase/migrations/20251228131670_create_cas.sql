-- Migration: create_cas
-- Created at: 2025-12-28T13:16:45+00:00

CREATE TABLE IF NOT EXISTS public.cas (
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
CREATE INDEX IF NOT EXISTS idx_cas_colaborador ON public.cas(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_cas_empresa ON public.cas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cas_status ON public.cas(status);

-- RLS
ALTER TABLE public.cas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cas_all" ON public.cas;
CREATE POLICY "cas_all" ON public.cas
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
