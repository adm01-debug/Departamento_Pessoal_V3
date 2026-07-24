-- Criar tabela de empresas (idempotent)
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj TEXT UNIQUE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  telefone TEXT,
  email TEXT,
  logo_url TEXT,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de associação usuário-empresa (idempotent)
CREATE TABLE IF NOT EXISTS public.user_empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, empresa_id)
);

-- Adicionar empresa_id nas tabelas principais (idempotent)
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);
ALTER TABLE public.admissoes ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);
ALTER TABLE public.afastamentos ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);
ALTER TABLE public.ferias ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);
ALTER TABLE public.desligamentos ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);
ALTER TABLE public.folhas_pagamento ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);
ALTER TABLE public.feriados ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);
ALTER TABLE public.registros_ponto ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);
ALTER TABLE public.relatorios_agendados ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);

-- Função para obter empresas do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_empresas(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id
  FROM public.user_empresas
  WHERE user_id = _user_id
$$;

-- Função para verificar se usuário pertence a uma empresa
CREATE OR REPLACE FUNCTION public.user_belongs_to_empresa(_user_id UUID, _empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_empresas
    WHERE user_id = _user_id
      AND empresa_id = _empresa_id
  )
$$;

-- Função para obter empresa padrão do usuário
CREATE OR REPLACE FUNCTION public.get_user_default_empresa(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id
  FROM public.user_empresas
  WHERE user_id = _user_id
    AND is_default = true
  LIMIT 1
$$;

-- Enable RLS nas novas tabelas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_empresas ENABLE ROW LEVEL SECURITY;

-- Políticas para empresas (idempotent)
DO $$ BEGIN
  CREATE POLICY "Usuários podem ver suas empresas"
    ON public.empresas FOR SELECT
    USING (id IN (SELECT public.get_user_empresas(auth.uid())));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins podem gerenciar empresas"
    ON public.empresas FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Políticas para user_empresas (idempotent)
DO $$ BEGIN
  CREATE POLICY "Usuários podem ver suas associações"
    ON public.user_empresas FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins podem gerenciar associações"
    ON public.user_empresas FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Atualizar políticas de colaboradores para filtrar por empresa
DROP POLICY IF EXISTS "Authenticated users can view colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Authenticated users can insert colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Authenticated users can update colaboradores" ON public.colaboradores;
DROP POLICY IF EXISTS "Authenticated users can delete colaboradores" ON public.colaboradores;

DO $$ BEGIN
  CREATE POLICY "Usuários podem ver colaboradores da sua empresa"
    ON public.colaboradores FOR SELECT
    USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())) OR empresa_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Usuários podem inserir colaboradores na sua empresa"
    ON public.colaboradores FOR INSERT
    WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())) OR empresa_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Usuários podem atualizar colaboradores da sua empresa"
    ON public.colaboradores FOR UPDATE
    USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())) OR empresa_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Usuários podem deletar colaboradores da sua empresa"
    ON public.colaboradores FOR DELETE
    USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())) OR empresa_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger para updated_at nas empresas (idempotent)
DROP TRIGGER IF EXISTS update_empresas_updated_at ON public.empresas;
CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa ON public.colaboradores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_admissoes_empresa ON public.admissoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_user_empresas_user ON public.user_empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_empresas_empresa ON public.user_empresas(empresa_id);
