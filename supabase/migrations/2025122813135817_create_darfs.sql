-- Migration: create_darfs
-- Created at: 2025-12-28T13:13:59+00:00

CREATE TABLE IF NOT EXISTS public.darfs (
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

CREATE INDEX IF NOT EXISTS idx_darfs_empresa ON public.darfs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_darfs_colaborador ON public.darfs(colaborador_id);
ALTER TABLE public.darfs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "darfs_all" ON public.darfs;
CREATE POLICY "darfs_all" ON public.darfs FOR ALL USING (auth.uid() IS NOT NULL);
