-- Migration: create_gratificacoes
-- Created at: 2025-12-28T13:16:19+00:00

CREATE TABLE IF NOT EXISTS public.gratificacoes (
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
CREATE INDEX IF NOT EXISTS idx_gratificacoes_colaborador ON public.gratificacoes(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_gratificacoes_empresa ON public.gratificacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_gratificacoes_created ON public.gratificacoes(created_at);

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
CREATE OR REPLACE FUNCTION update_gratificacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gratificacoes_updated_at ON public.gratificacoes;
CREATE TRIGGER trigger_gratificacoes_updated_at
  BEFORE UPDATE ON public.gratificacoes
  FOR EACH ROW EXECUTE FUNCTION update_gratificacoes_updated_at();
