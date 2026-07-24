-- Migration: create_recibos_rescisao
-- Created at: 2025-12-28T13:13:57+00:00

CREATE TABLE IF NOT EXISTS public.recibos_rescisao (
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

CREATE INDEX IF NOT EXISTS idx_recibos_rescisao_empresa ON public.recibos_rescisao(empresa_id);
CREATE INDEX IF NOT EXISTS idx_recibos_rescisao_colaborador ON public.recibos_rescisao(colaborador_id);
ALTER TABLE public.recibos_rescisao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recibos_rescisao_all" ON public.recibos_rescisao;
CREATE POLICY "recibos_rescisao_all" ON public.recibos_rescisao FOR ALL USING (auth.uid() IS NOT NULL);
