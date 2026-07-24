-- Migration: create_emprestimos_consignados
-- Created at: 2025-12-28T13:16:20+00:00

CREATE TABLE IF NOT EXISTS public.emprestimos_consignados (
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
CREATE INDEX IF NOT EXISTS idx_emprestimos_consignados_colaborador ON public.emprestimos_consignados(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_emprestimos_consignados_empresa ON public.emprestimos_consignados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_emprestimos_consignados_created ON public.emprestimos_consignados(created_at);

-- RLS
ALTER TABLE public.emprestimos_consignados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emprestimos_consignados_select" ON public.emprestimos_consignados;
CREATE POLICY "emprestimos_consignados_select" ON public.emprestimos_consignados
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "emprestimos_consignados_insert" ON public.emprestimos_consignados;
CREATE POLICY "emprestimos_consignados_insert" ON public.emprestimos_consignados
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "emprestimos_consignados_update" ON public.emprestimos_consignados;
CREATE POLICY "emprestimos_consignados_update" ON public.emprestimos_consignados
  FOR UPDATE USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "emprestimos_consignados_delete" ON public.emprestimos_consignados;
CREATE POLICY "emprestimos_consignados_delete" ON public.emprestimos_consignados
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_emprestimos_consignados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_emprestimos_consignados_updated_at ON public.emprestimos_consignados;
CREATE TRIGGER trigger_emprestimos_consignados_updated_at
  BEFORE UPDATE ON public.emprestimos_consignados
  FOR EACH ROW EXECUTE FUNCTION update_emprestimos_consignados_updated_at();
