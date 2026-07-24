-- Migration: create_holerites
-- Created at: 2025-12-28T13:13:42+00:00

CREATE TABLE IF NOT EXISTS public.holerites (
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
CREATE INDEX IF NOT EXISTS idx_holerites_empresa ON public.holerites(empresa_id);
CREATE INDEX IF NOT EXISTS idx_holerites_colaborador ON public.holerites(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_holerites_status ON public.holerites(status);

-- RLS
ALTER TABLE public.holerites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "holerites_select" ON public.holerites;
CREATE POLICY "holerites_select" ON public.holerites
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "holerites_insert" ON public.holerites;
CREATE POLICY "holerites_insert" ON public.holerites
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "holerites_update" ON public.holerites;
CREATE POLICY "holerites_update" ON public.holerites
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "holerites_delete" ON public.holerites;
CREATE POLICY "holerites_delete" ON public.holerites
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_holerites_updated_at ON public.holerites;
CREATE TRIGGER update_holerites_updated_at
  BEFORE UPDATE ON public.holerites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
