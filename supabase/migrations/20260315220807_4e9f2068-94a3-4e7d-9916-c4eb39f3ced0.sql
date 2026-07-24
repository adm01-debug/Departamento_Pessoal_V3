
-- Avaliação de Desempenho tables
CREATE TABLE IF NOT EXISTS public.ciclos_avaliacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho',
  tipo TEXT DEFAULT 'anual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.metas_okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  colaborador_id UUID REFERENCES public.colaboradores(id),
  ciclo_id UUID REFERENCES public.ciclos_avaliacao(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'individual',
  progresso NUMERIC DEFAULT 0,
  meta_valor NUMERIC,
  valor_atual NUMERIC,
  data_limite DATE,
  status TEXT DEFAULT 'em_andamento',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedbacks_360 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  ciclo_id UUID REFERENCES public.ciclos_avaliacao(id) ON DELETE SET NULL,
  avaliado_id UUID REFERENCES public.colaboradores(id),
  avaliador_id UUID REFERENCES public.colaboradores(id),
  tipo TEXT DEFAULT 'par',
  nota_geral NUMERIC,
  pontos_fortes TEXT,
  pontos_melhoria TEXT,
  comentarios TEXT,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pdis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  colaborador_id UUID REFERENCES public.colaboradores(id),
  titulo TEXT NOT NULL,
  descricao TEXT,
  competencia TEXT,
  acao TEXT,
  prazo DATE,
  status TEXT DEFAULT 'pendente',
  progresso NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.competencias_matriz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  nivel_esperado NUMERIC DEFAULT 3,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ciclos_avaliacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks_360 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencias_matriz ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "ciclos_avaliacao_select" ON public.ciclos_avaliacao;
CREATE POLICY "ciclos_avaliacao_select" ON public.ciclos_avaliacao FOR SELECT TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "ciclos_avaliacao_insert" ON public.ciclos_avaliacao;
CREATE POLICY "ciclos_avaliacao_insert" ON public.ciclos_avaliacao FOR INSERT TO authenticated WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "ciclos_avaliacao_update" ON public.ciclos_avaliacao;
CREATE POLICY "ciclos_avaliacao_update" ON public.ciclos_avaliacao FOR UPDATE TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "ciclos_avaliacao_delete" ON public.ciclos_avaliacao;
CREATE POLICY "ciclos_avaliacao_delete" ON public.ciclos_avaliacao FOR DELETE TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "metas_okrs_select" ON public.metas_okrs;
CREATE POLICY "metas_okrs_select" ON public.metas_okrs FOR SELECT TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "metas_okrs_insert" ON public.metas_okrs;
CREATE POLICY "metas_okrs_insert" ON public.metas_okrs FOR INSERT TO authenticated WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "metas_okrs_update" ON public.metas_okrs;
CREATE POLICY "metas_okrs_update" ON public.metas_okrs FOR UPDATE TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "metas_okrs_delete" ON public.metas_okrs;
CREATE POLICY "metas_okrs_delete" ON public.metas_okrs FOR DELETE TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "feedbacks_360_select" ON public.feedbacks_360;
CREATE POLICY "feedbacks_360_select" ON public.feedbacks_360 FOR SELECT TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "feedbacks_360_insert" ON public.feedbacks_360;
CREATE POLICY "feedbacks_360_insert" ON public.feedbacks_360 FOR INSERT TO authenticated WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "feedbacks_360_update" ON public.feedbacks_360;
CREATE POLICY "feedbacks_360_update" ON public.feedbacks_360 FOR UPDATE TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "feedbacks_360_delete" ON public.feedbacks_360;
CREATE POLICY "feedbacks_360_delete" ON public.feedbacks_360 FOR DELETE TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "pdis_select" ON public.pdis;
CREATE POLICY "pdis_select" ON public.pdis FOR SELECT TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "pdis_insert" ON public.pdis;
CREATE POLICY "pdis_insert" ON public.pdis FOR INSERT TO authenticated WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "pdis_update" ON public.pdis;
CREATE POLICY "pdis_update" ON public.pdis FOR UPDATE TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "pdis_delete" ON public.pdis;
CREATE POLICY "pdis_delete" ON public.pdis FOR DELETE TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "competencias_select" ON public.competencias_matriz;
CREATE POLICY "competencias_select" ON public.competencias_matriz FOR SELECT TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "competencias_insert" ON public.competencias_matriz;
CREATE POLICY "competencias_insert" ON public.competencias_matriz FOR INSERT TO authenticated WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "competencias_update" ON public.competencias_matriz;
CREATE POLICY "competencias_update" ON public.competencias_matriz FOR UPDATE TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "competencias_delete" ON public.competencias_matriz;
CREATE POLICY "competencias_delete" ON public.competencias_matriz FOR DELETE TO authenticated USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
