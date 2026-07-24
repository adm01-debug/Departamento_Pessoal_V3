-- Migration: create_dependentes
-- Created at: 2025-12-28T13:13:35+00:00

CREATE TABLE IF NOT EXISTS public.dependentes (
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
CREATE INDEX IF NOT EXISTS idx_dependentes_empresa ON public.dependentes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_dependentes_colaborador ON public.dependentes(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_dependentes_status ON public.dependentes(status);

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
DROP TRIGGER IF EXISTS update_dependentes_updated_at ON public.dependentes;
CREATE TRIGGER update_dependentes_updated_at
  BEFORE UPDATE ON public.dependentes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
