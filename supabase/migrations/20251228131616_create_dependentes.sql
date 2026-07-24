-- Migration: create_dependentes
-- Created at: 2025-12-28T13:16:15+00:00

CREATE TABLE IF NOT EXISTS public.dependentes (
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
CREATE INDEX IF NOT EXISTS idx_dependentes_colaborador ON public.dependentes(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_dependentes_empresa ON public.dependentes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_dependentes_created ON public.dependentes(created_at);

-- RLS
ALTER TABLE public.dependentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dependentes_select" ON public.dependentes;
CREATE POLICY "dependentes_select" ON public.dependentes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "dependentes_insert" ON public.dependentes;
CREATE POLICY "dependentes_insert" ON public.dependentes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "dependentes_update" ON public.dependentes;
CREATE POLICY "dependentes_update" ON public.dependentes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "dependentes_delete" ON public.dependentes;
CREATE POLICY "dependentes_delete" ON public.dependentes
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_dependentes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_dependentes_updated_at ON public.dependentes;
CREATE TRIGGER trigger_dependentes_updated_at
  BEFORE UPDATE ON public.dependentes
  FOR EACH ROW EXECUTE FUNCTION update_dependentes_updated_at();
