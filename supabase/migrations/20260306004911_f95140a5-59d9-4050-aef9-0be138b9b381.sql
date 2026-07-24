
-- Tabela beneficios (usada em beneficioService, beneficiosService, relatorioService, backupService)
CREATE TABLE IF NOT EXISTS public.beneficios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'outros',
  descricao TEXT,
  valor NUMERIC DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'ativo',
  data_inicio TEXT,
  data_fim TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.beneficios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage beneficios" ON public.beneficios;
CREATE POLICY "Auth users manage beneficios" ON public.beneficios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tabela colaborador_beneficios (usada em beneficioService para vincular)
CREATE TABLE IF NOT EXISTS public.colaborador_beneficios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficio_id UUID REFERENCES public.beneficios(id) ON DELETE CASCADE NOT NULL,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(beneficio_id, colaborador_id)
);
ALTER TABLE public.colaborador_beneficios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage colaborador_beneficios" ON public.colaborador_beneficios;
CREATE POLICY "Auth users manage colaborador_beneficios" ON public.colaborador_beneficios FOR ALL TO authenticated USING (true) WITH CHECK (true);
