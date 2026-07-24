-- Migration: create_pensoes
-- Created at: 2025-12-28T13:16:20+00:00

CREATE TABLE IF NOT EXISTS public.pensoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  
  -- Campos específicos
  descricao TEXT,
  valor DECIMAL(15,2) DEFAULT 0,
  data_inicio DATE,
  data_fim DATE,
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pensoes_colaborador ON public.pensoes(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_pensoes_empresa ON public.pensoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pensoes_created ON public.pensoes(created_at);

-- RLS
ALTER TABLE public.pensoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pensoes_select" ON public.pensoes;
CREATE POLICY "pensoes_select" ON public.pensoes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "pensoes_insert" ON public.pensoes;
CREATE POLICY "pensoes_insert" ON public.pensoes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "pensoes_update" ON public.pensoes;
CREATE POLICY "pensoes_update" ON public.pensoes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "pensoes_delete" ON public.pensoes;
CREATE POLICY "pensoes_delete" ON public.pensoes
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_pensoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pensoes_updated_at ON public.pensoes;
CREATE TRIGGER trigger_pensoes_updated_at
  BEFORE UPDATE ON public.pensoes
  FOR EACH ROW EXECUTE FUNCTION update_pensoes_updated_at();
