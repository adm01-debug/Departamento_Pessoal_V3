-- Migration: create_adicionais
-- Created at: 2025-12-28T13:13:39+00:00

CREATE TABLE IF NOT EXISTS public.adicionais (
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
CREATE INDEX IF NOT EXISTS idx_adicionais_empresa ON public.adicionais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_adicionais_colaborador ON public.adicionais(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_adicionais_status ON public.adicionais(status);

-- RLS
ALTER TABLE public.adicionais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "adicionais_select" ON public.adicionais;
CREATE POLICY "adicionais_select" ON public.adicionais
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "adicionais_insert" ON public.adicionais;
CREATE POLICY "adicionais_insert" ON public.adicionais
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "adicionais_update" ON public.adicionais;
CREATE POLICY "adicionais_update" ON public.adicionais
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "adicionais_delete" ON public.adicionais;
CREATE POLICY "adicionais_delete" ON public.adicionais
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_adicionais_updated_at ON public.adicionais;
CREATE TRIGGER update_adicionais_updated_at
  BEFORE UPDATE ON public.adicionais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
