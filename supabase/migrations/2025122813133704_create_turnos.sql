-- Migration: create_turnos
-- Created at: 2025-12-28T13:13:37+00:00

CREATE TABLE IF NOT EXISTS public.turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  descricao TEXT,
  valor DECIMAL(15,2),
  data_inicio DATE,
  data_fim DATE,
  status VARCHAR(50) DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_turnos_empresa ON public.turnos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_turnos_colaborador ON public.turnos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_turnos_status ON public.turnos(status);

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
DROP TRIGGER IF EXISTS update_turnos_updated_at ON public.turnos;
CREATE TRIGGER update_turnos_updated_at
  BEFORE UPDATE ON public.turnos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
