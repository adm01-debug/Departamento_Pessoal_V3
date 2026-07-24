-- Migration: create_gratificacoes
-- Created at: 2025-12-28T13:13:39+00:00

CREATE TABLE IF NOT EXISTS public.gratificacoes (
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
CREATE INDEX IF NOT EXISTS idx_gratificacoes_empresa ON public.gratificacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_gratificacoes_colaborador ON public.gratificacoes(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_gratificacoes_status ON public.gratificacoes(status);

-- RLS
ALTER TABLE public.gratificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gratificacoes_select" ON public.gratificacoes;
CREATE POLICY "gratificacoes_select" ON public.gratificacoes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "gratificacoes_insert" ON public.gratificacoes;
CREATE POLICY "gratificacoes_insert" ON public.gratificacoes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "gratificacoes_update" ON public.gratificacoes;
CREATE POLICY "gratificacoes_update" ON public.gratificacoes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "gratificacoes_delete" ON public.gratificacoes;
CREATE POLICY "gratificacoes_delete" ON public.gratificacoes
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_gratificacoes_updated_at ON public.gratificacoes;
CREATE TRIGGER update_gratificacoes_updated_at
  BEFORE UPDATE ON public.gratificacoes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
