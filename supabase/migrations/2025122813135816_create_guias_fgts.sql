-- Migration: create_guias_fgts
-- Created at: 2025-12-28T13:13:58+00:00

CREATE TABLE IF NOT EXISTS public.guias_fgts (
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

CREATE INDEX IF NOT EXISTS idx_guias_fgts_empresa ON public.guias_fgts(empresa_id);
CREATE INDEX IF NOT EXISTS idx_guias_fgts_colaborador ON public.guias_fgts(colaborador_id);
ALTER TABLE public.guias_fgts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guias_fgts_all" ON public.guias_fgts;
CREATE POLICY "guias_fgts_all" ON public.guias_fgts FOR ALL USING (auth.uid() IS NOT NULL);
