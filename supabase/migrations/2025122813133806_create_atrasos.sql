-- Migration: create_atrasos
-- Created at: 2025-12-28T13:13:38+00:00

CREATE TABLE IF NOT EXISTS public.atrasos (
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
CREATE INDEX IF NOT EXISTS idx_atrasos_empresa ON public.atrasos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_atrasos_colaborador ON public.atrasos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_atrasos_status ON public.atrasos(status);

-- RLS
ALTER TABLE public.atrasos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "atrasos_select" ON public.atrasos;
CREATE POLICY "atrasos_select" ON public.atrasos
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "atrasos_insert" ON public.atrasos;
CREATE POLICY "atrasos_insert" ON public.atrasos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "atrasos_update" ON public.atrasos;
CREATE POLICY "atrasos_update" ON public.atrasos
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "atrasos_delete" ON public.atrasos;
CREATE POLICY "atrasos_delete" ON public.atrasos
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_atrasos_updated_at ON public.atrasos;
CREATE TRIGGER update_atrasos_updated_at
  BEFORE UPDATE ON public.atrasos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
