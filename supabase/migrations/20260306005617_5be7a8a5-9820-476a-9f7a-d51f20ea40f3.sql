
-- convenios table (convenioService.ts)
CREATE TABLE IF NOT EXISTS public.convenios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'farmacia',
  limite_global NUMERIC DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.convenios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage convenios" ON public.convenios;
CREATE POLICY "Auth users manage convenios" ON public.convenios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- convenios_colaboradores table
CREATE TABLE IF NOT EXISTS public.convenios_colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  convenio_id UUID REFERENCES public.convenios(id) ON DELETE CASCADE NOT NULL,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
  limite_individual NUMERIC DEFAULT 0,
  saldo_utilizado NUMERIC DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.convenios_colaboradores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage convenios_colaboradores" ON public.convenios_colaboradores;
CREATE POLICY "Auth users manage convenios_colaboradores" ON public.convenios_colaboradores FOR ALL TO authenticated USING (true) WITH CHECK (true);
