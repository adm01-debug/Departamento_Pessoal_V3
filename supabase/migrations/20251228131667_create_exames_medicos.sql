-- Migration: create_exames_medicos
-- Created at: 2025-12-28T13:16:43+00:00

CREATE TABLE IF NOT EXISTS public.exames_medicos (
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
CREATE INDEX IF NOT EXISTS idx_exames_medicos_colaborador ON public.exames_medicos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_exames_medicos_empresa ON public.exames_medicos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_exames_medicos_status ON public.exames_medicos(status);

-- RLS
ALTER TABLE public.exames_medicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exames_medicos_all" ON public.exames_medicos;
CREATE POLICY "exames_medicos_all" ON public.exames_medicos
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
