-- Migration: create_exames_medicos
-- Created at: 2025-12-28T13:14:01+00:00

CREATE TABLE IF NOT EXISTS public.exames_medicos (
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

CREATE INDEX IF NOT EXISTS idx_exames_medicos_empresa ON public.exames_medicos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_exames_medicos_colaborador ON public.exames_medicos(colaborador_id);
ALTER TABLE public.exames_medicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exames_medicos_all" ON public.exames_medicos;
CREATE POLICY "exames_medicos_all" ON public.exames_medicos FOR ALL USING (auth.uid() IS NOT NULL);
