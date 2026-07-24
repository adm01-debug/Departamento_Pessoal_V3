
-- 1. Tabela escalas (usada em useEscalas.ts)
CREATE TABLE IF NOT EXISTS public.escalas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'padrao',
  empresa_id UUID REFERENCES public.empresas(id),
  dias_trabalho INTEGER DEFAULT 5,
  dias_folga INTEGER DEFAULT 2,
  horario_entrada TEXT,
  horario_saida TEXT,
  intervalo_minutos INTEGER DEFAULT 60,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.escalas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage escalas" ON public.escalas;
CREATE POLICY "Auth users manage escalas" ON public.escalas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Tabela vales_alimentacao (usada em valeAlimentacaoService.ts)
CREATE TABLE IF NOT EXISTS public.vales_alimentacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  valor_mensal NUMERIC DEFAULT 0,
  valor_por_dia NUMERIC,
  dias_uteis INTEGER DEFAULT 22,
  tipo TEXT DEFAULT 'alimentacao',
  ativo BOOLEAN DEFAULT true,
  data_inicio TEXT,
  data_fim TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vales_alimentacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage vales_alimentacao" ON public.vales_alimentacao;
CREATE POLICY "Auth users manage vales_alimentacao" ON public.vales_alimentacao FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Tabela recargas_vale (usada em valeAlimentacaoService.ts)
CREATE TABLE IF NOT EXISTS public.recargas_vale (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vale_id UUID REFERENCES public.vales_alimentacao(id) ON DELETE CASCADE,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL,
  data_recarga TEXT,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recargas_vale ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage recargas_vale" ON public.recargas_vale;
CREATE POLICY "Auth users manage recargas_vale" ON public.recargas_vale FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Tabela saved_filters (usada em useSavedFilters.ts)
CREATE TABLE IF NOT EXISTS public.saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  name TEXT NOT NULL,
  filters JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own filters" ON public.saved_filters;
CREATE POLICY "Users manage own filters" ON public.saved_filters FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
