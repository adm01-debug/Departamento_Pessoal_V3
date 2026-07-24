-- Migration: create_recibos_ferias
-- Created at: 2025-12-28T13:16:22+00:00

CREATE TABLE IF NOT EXISTS public.recibos_ferias (
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
CREATE INDEX IF NOT EXISTS idx_recibos_ferias_colaborador ON public.recibos_ferias(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_recibos_ferias_empresa ON public.recibos_ferias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_recibos_ferias_created ON public.recibos_ferias(created_at);

-- RLS
ALTER TABLE public.recibos_ferias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recibos_ferias_select" ON public.recibos_ferias;
CREATE POLICY "recibos_ferias_select" ON public.recibos_ferias
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "recibos_ferias_insert" ON public.recibos_ferias;
CREATE POLICY "recibos_ferias_insert" ON public.recibos_ferias
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "recibos_ferias_update" ON public.recibos_ferias;
CREATE POLICY "recibos_ferias_update" ON public.recibos_ferias
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "recibos_ferias_delete" ON public.recibos_ferias;
CREATE POLICY "recibos_ferias_delete" ON public.recibos_ferias
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_recibos_ferias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recibos_ferias_updated_at ON public.recibos_ferias;
CREATE TRIGGER trigger_recibos_ferias_updated_at
  BEFORE UPDATE ON public.recibos_ferias
  FOR EACH ROW EXECUTE FUNCTION update_recibos_ferias_updated_at();
