-- Migration: create_homologacoes
-- Created at: 2025-12-28T13:14:00+00:00

CREATE TABLE IF NOT EXISTS public.homologacoes (
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

CREATE INDEX IF NOT EXISTS idx_homologacoes_empresa ON public.homologacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_homologacoes_colaborador ON public.homologacoes(colaborador_id);
ALTER TABLE public.homologacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homologacoes_all" ON public.homologacoes;
CREATE POLICY "homologacoes_all" ON public.homologacoes FOR ALL USING (auth.uid() IS NOT NULL);
