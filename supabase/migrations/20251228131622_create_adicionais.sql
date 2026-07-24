-- Migration: create_adicionais
-- Created at: 2025-12-28T13:16:18+00:00

CREATE TABLE IF NOT EXISTS public.adicionais (
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
CREATE INDEX IF NOT EXISTS idx_adicionais_colaborador ON public.adicionais(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_adicionais_empresa ON public.adicionais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_adicionais_created ON public.adicionais(created_at);

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
CREATE OR REPLACE FUNCTION update_adicionais_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_adicionais_updated_at ON public.adicionais;
CREATE TRIGGER trigger_adicionais_updated_at
  BEFORE UPDATE ON public.adicionais
  FOR EACH ROW EXECUTE FUNCTION update_adicionais_updated_at();
