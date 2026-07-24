
-- 1. Tabela auditoria (usada em authService login/logout)
CREATE TABLE IF NOT EXISTS public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID,
  usuario_nome TEXT,
  acao TEXT NOT NULL,
  empresa_id TEXT,
  entidade TEXT,
  entidade_id TEXT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  descricao TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can insert auditoria" ON public.auditoria;
CREATE POLICY "Authenticated users can insert auditoria" ON public.auditoria FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can read auditoria" ON public.auditoria;
CREATE POLICY "Authenticated users can read auditoria" ON public.auditoria FOR SELECT TO authenticated USING (true);

-- 2. Tabela departamentos
CREATE TABLE IF NOT EXISTS public.departamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id),
  gestor_id UUID,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage departamentos" ON public.departamentos;
CREATE POLICY "Auth users manage departamentos" ON public.departamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Tabela cargos
CREATE TABLE IF NOT EXISTS public.cargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  departamento_id UUID REFERENCES public.departamentos(id),
  empresa_id UUID REFERENCES public.empresas(id),
  cbo TEXT,
  salario_base NUMERIC,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage cargos" ON public.cargos;
CREATE POLICY "Auth users manage cargos" ON public.cargos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Tabela vinculos
CREATE TABLE IF NOT EXISTS public.vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL,
  categoria TEXT,
  data_inicio TEXT NOT NULL,
  data_fim TEXT,
  matricula TEXT,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vinculos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage vinculos" ON public.vinculos;
CREATE POLICY "Auth users manage vinculos" ON public.vinculos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Tabela treinamentos
CREATE TABLE IF NOT EXISTS public.treinamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  data TEXT,
  carga_horaria NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage treinamentos" ON public.treinamentos;
CREATE POLICY "Auth users manage treinamentos" ON public.treinamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Tabela treinamento_participantes
CREATE TABLE IF NOT EXISTS public.treinamento_participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treinamento_id UUID REFERENCES public.treinamentos(id) ON DELETE CASCADE NOT NULL,
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
  presente BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.treinamento_participantes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage treinamento_participantes" ON public.treinamento_participantes;
CREATE POLICY "Auth users manage treinamento_participantes" ON public.treinamento_participantes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Tabela transferencias
CREATE TABLE IF NOT EXISTS public.transferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
  departamento_anterior_id UUID REFERENCES public.departamentos(id),
  departamento_novo_id UUID REFERENCES public.departamentos(id),
  data_vigencia TEXT NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage transferencias" ON public.transferencias;
CREATE POLICY "Auth users manage transferencias" ON public.transferencias FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. Tabela sefip_arquivos
CREATE TABLE IF NOT EXISTS public.sefip_arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  competencia TEXT NOT NULL,
  modalidade INTEGER DEFAULT 1,
  status TEXT DEFAULT 'rascunho',
  total_remuneracao NUMERIC DEFAULT 0,
  total_fgts NUMERIC DEFAULT 0,
  total_colaboradores INTEGER DEFAULT 0,
  conteudo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sefip_arquivos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage sefip_arquivos" ON public.sefip_arquivos;
CREATE POLICY "Auth users manage sefip_arquivos" ON public.sefip_arquivos FOR ALL TO authenticated USING (true) WITH CHECK (true);
