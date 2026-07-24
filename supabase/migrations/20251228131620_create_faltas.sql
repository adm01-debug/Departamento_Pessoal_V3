-- Migration: create_faltas
-- Created at: 2025-12-28T13:16:17+00:00

CREATE TABLE IF NOT EXISTS public.faltas (
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
CREATE INDEX IF NOT EXISTS idx_faltas_colaborador ON public.faltas(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_faltas_empresa ON public.faltas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_faltas_created ON public.faltas(created_at);

-- RLS
ALTER TABLE public.faltas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faltas_select" ON public.faltas;
CREATE POLICY "faltas_select" ON public.faltas
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "faltas_insert" ON public.faltas;
CREATE POLICY "faltas_insert" ON public.faltas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "faltas_update" ON public.faltas;
CREATE POLICY "faltas_update" ON public.faltas
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "faltas_delete" ON public.faltas;
CREATE POLICY "faltas_delete" ON public.faltas
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_faltas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_faltas_updated_at ON public.faltas;
CREATE TRIGGER trigger_faltas_updated_at
  BEFORE UPDATE ON public.faltas
  FOR EACH ROW EXECUTE FUNCTION update_faltas_updated_at();
