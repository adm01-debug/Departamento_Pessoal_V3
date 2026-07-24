-- Migration: create_escalas
-- Created at: 2025-12-28T13:13:36+00:00

CREATE TABLE IF NOT EXISTS public.escalas (
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
CREATE INDEX IF NOT EXISTS idx_escalas_empresa ON public.escalas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_escalas_colaborador ON public.escalas(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_escalas_status ON public.escalas(status);

-- RLS
ALTER TABLE public.escalas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "escalas_select" ON public.escalas;
CREATE POLICY "escalas_select" ON public.escalas
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "escalas_insert" ON public.escalas;
CREATE POLICY "escalas_insert" ON public.escalas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "escalas_update" ON public.escalas;
CREATE POLICY "escalas_update" ON public.escalas
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "escalas_delete" ON public.escalas;
CREATE POLICY "escalas_delete" ON public.escalas
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_escalas_updated_at ON public.escalas;
CREATE TRIGGER update_escalas_updated_at
  BEFORE UPDATE ON public.escalas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
