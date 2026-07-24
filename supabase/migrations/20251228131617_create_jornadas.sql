-- Migration: create_jornadas
-- Created at: 2025-12-28T13:16:15+00:00

CREATE TABLE IF NOT EXISTS public.jornadas (
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
CREATE INDEX IF NOT EXISTS idx_jornadas_colaborador ON public.jornadas(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_jornadas_empresa ON public.jornadas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_jornadas_created ON public.jornadas(created_at);

-- RLS
ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jornadas_select" ON public.jornadas;
CREATE POLICY "jornadas_select" ON public.jornadas
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "jornadas_insert" ON public.jornadas;
CREATE POLICY "jornadas_insert" ON public.jornadas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "jornadas_update" ON public.jornadas;
CREATE POLICY "jornadas_update" ON public.jornadas
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "jornadas_delete" ON public.jornadas;
CREATE POLICY "jornadas_delete" ON public.jornadas
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_jornadas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_jornadas_updated_at ON public.jornadas;
CREATE TRIGGER trigger_jornadas_updated_at
  BEFORE UPDATE ON public.jornadas
  FOR EACH ROW EXECUTE FUNCTION update_jornadas_updated_at();
