-- Migration: create_guias_inss
-- Created at: 2025-12-28T13:13:57+00:00

CREATE TABLE IF NOT EXISTS public.guias_inss (
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

CREATE INDEX IF NOT EXISTS idx_guias_inss_empresa ON public.guias_inss(empresa_id);
CREATE INDEX IF NOT EXISTS idx_guias_inss_colaborador ON public.guias_inss(colaborador_id);
ALTER TABLE public.guias_inss ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guias_inss_all" ON public.guias_inss;
CREATE POLICY "guias_inss_all" ON public.guias_inss FOR ALL USING (auth.uid() IS NOT NULL);
