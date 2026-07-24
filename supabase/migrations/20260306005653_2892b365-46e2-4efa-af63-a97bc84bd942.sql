
-- seguros_colaboradores (seguroVidaService.ts)
CREATE TABLE IF NOT EXISTS public.seguros_colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seguro_vida_id UUID REFERENCES public.seguros_vida(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  data_adesao DATE,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.seguros_colaboradores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage seguros_colaboradores" ON public.seguros_colaboradores;
CREATE POLICY "Auth users manage seguros_colaboradores" ON public.seguros_colaboradores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- beneficiarios_seguro (seguroVidaService.ts)
CREATE TABLE IF NOT EXISTS public.beneficiarios_seguro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seguro_vida_id UUID REFERENCES public.seguros_vida(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  parentesco TEXT,
  cpf TEXT,
  percentual NUMERIC DEFAULT 100,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.beneficiarios_seguro ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage beneficiarios_seguro" ON public.beneficiarios_seguro;
CREATE POLICY "Auth users manage beneficiarios_seguro" ON public.beneficiarios_seguro FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sinistros_seguro (seguroVidaService.ts)
CREATE TABLE IF NOT EXISTS public.sinistros_seguro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seguro_vida_id UUID REFERENCES public.seguros_vida(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo TEXT,
  descricao TEXT,
  data_sinistro TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'aberto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sinistros_seguro ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage sinistros_seguro" ON public.sinistros_seguro;
CREATE POLICY "Auth users manage sinistros_seguro" ON public.sinistros_seguro FOR ALL TO authenticated USING (true) WITH CHECK (true);
