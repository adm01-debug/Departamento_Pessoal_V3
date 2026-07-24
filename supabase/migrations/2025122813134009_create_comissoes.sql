-- Migration: create_comissoes
-- Created at: 2025-12-28T13:13:40+00:00

CREATE TABLE IF NOT EXISTS public.comissoes (
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
CREATE INDEX IF NOT EXISTS idx_comissoes_empresa ON public.comissoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_colaborador ON public.comissoes(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_status ON public.comissoes(status);

-- RLS
ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comissoes_select" ON public.comissoes;
CREATE POLICY "comissoes_select" ON public.comissoes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "comissoes_insert" ON public.comissoes;
CREATE POLICY "comissoes_insert" ON public.comissoes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "comissoes_update" ON public.comissoes;
CREATE POLICY "comissoes_update" ON public.comissoes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "comissoes_delete" ON public.comissoes;
CREATE POLICY "comissoes_delete" ON public.comissoes
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_comissoes_updated_at ON public.comissoes;
CREATE TRIGGER update_comissoes_updated_at
  BEFORE UPDATE ON public.comissoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
