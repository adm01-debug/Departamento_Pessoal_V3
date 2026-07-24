
-- More missing tables

-- 1. sindicatos
CREATE TABLE IF NOT EXISTS public.sindicatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  contribuicao_mensal NUMERIC DEFAULT 0,
  data_base TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sindicatos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage sindicatos" ON public.sindicatos;
CREATE POLICY "Auth users manage sindicatos" ON public.sindicatos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. guias_fgts
CREATE TABLE IF NOT EXISTS public.guias_fgts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  competencia TEXT NOT NULL,
  tipo TEXT DEFAULT 'mensal',
  valor_total NUMERIC DEFAULT 0,
  valor_multa NUMERIC DEFAULT 0,
  valor_total_recolher NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pendente',
  data_vencimento DATE,
  data_pagamento TIMESTAMPTZ,
  codigo_barras TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.guias_fgts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage guias_fgts" ON public.guias_fgts;
CREATE POLICY "Auth users manage guias_fgts" ON public.guias_fgts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. guias_inss
CREATE TABLE IF NOT EXISTS public.guias_inss (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  competencia TEXT NOT NULL,
  tipo TEXT DEFAULT 'mensal',
  valor_empresa NUMERIC DEFAULT 0,
  valor_segurados NUMERIC DEFAULT 0,
  valor_total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pendente',
  data_vencimento DATE,
  data_pagamento TIMESTAMPTZ,
  codigo_barras TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.guias_inss ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage guias_inss" ON public.guias_inss;
CREATE POLICY "Auth users manage guias_inss" ON public.guias_inss FOR ALL TO authenticated USING (true) WITH CHECK (true);
