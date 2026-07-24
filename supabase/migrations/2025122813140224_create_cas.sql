-- Migration: create_cas
-- Created at: 2025-12-28T13:14:02+00:00

CREATE TABLE IF NOT EXISTS public.cas (
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

CREATE INDEX IF NOT EXISTS idx_cas_empresa ON public.cas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cas_colaborador ON public.cas(colaborador_id);
ALTER TABLE public.cas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cas_all" ON public.cas;
CREATE POLICY "cas_all" ON public.cas FOR ALL USING (auth.uid() IS NOT NULL);
