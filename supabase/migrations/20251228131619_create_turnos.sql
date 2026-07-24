-- Migration: create_turnos
-- Created at: 2025-12-28T13:16:16+00:00

CREATE TABLE IF NOT EXISTS public.turnos (
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
CREATE INDEX IF NOT EXISTS idx_turnos_colaborador ON public.turnos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_turnos_empresa ON public.turnos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_turnos_created ON public.turnos(created_at);

-- RLS
ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "turnos_select" ON public.turnos;
CREATE POLICY "turnos_select" ON public.turnos
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "turnos_insert" ON public.turnos;
CREATE POLICY "turnos_insert" ON public.turnos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "turnos_update" ON public.turnos;
CREATE POLICY "turnos_update" ON public.turnos
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "turnos_delete" ON public.turnos;
CREATE POLICY "turnos_delete" ON public.turnos
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_turnos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_turnos_updated_at ON public.turnos;
CREATE TRIGGER trigger_turnos_updated_at
  BEFORE UPDATE ON public.turnos
  FOR EACH ROW EXECUTE FUNCTION update_turnos_updated_at();
