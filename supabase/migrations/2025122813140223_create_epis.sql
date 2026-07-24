-- Migration: create_epis
-- Created at: 2025-12-28T13:14:02+00:00

CREATE TABLE IF NOT EXISTS public.epis (
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

CREATE INDEX IF NOT EXISTS idx_epis_empresa ON public.epis(empresa_id);
CREATE INDEX IF NOT EXISTS idx_epis_colaborador ON public.epis(colaborador_id);
ALTER TABLE public.epis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "epis_all" ON public.epis;
CREATE POLICY "epis_all" ON public.epis FOR ALL USING (auth.uid() IS NOT NULL);
