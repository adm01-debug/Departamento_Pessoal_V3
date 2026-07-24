-- Migration: create_grrf
-- Created at: 2025-12-28T13:13:59+00:00

CREATE TABLE IF NOT EXISTS public.grrf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  numero VARCHAR(100),
  descricao TEXT,
  valor DECIMAL(15,2),
  data_emissao DATE,
  data_vencimento DATE,
  status VARCHAR(50) DEFAULT 'pendente',
  arquivo_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grrf_empresa ON public.grrf(empresa_id);
CREATE INDEX IF NOT EXISTS idx_grrf_colaborador ON public.grrf(colaborador_id);
ALTER TABLE public.grrf ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grrf_all" ON public.grrf;
CREATE POLICY "grrf_all" ON public.grrf FOR ALL USING (auth.uid() IS NOT NULL);
