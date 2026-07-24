
-- ================================
-- 1. PESQUISAS DE CLIMA / eNPS
-- ================================
CREATE TABLE IF NOT EXISTS public.pesquisas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  tipo text DEFAULT 'clima',
  status text DEFAULT 'rascunho',
  anonima boolean DEFAULT true,
  data_inicio date,
  data_fim date,
  empresa_id uuid REFERENCES public.empresas(id),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pesquisas_perguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id uuid REFERENCES public.pesquisas(id) ON DELETE CASCADE NOT NULL,
  texto text NOT NULL,
  tipo text DEFAULT 'escala',
  opcoes jsonb,
  ordem int DEFAULT 0,
  obrigatoria boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pesquisas_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id uuid REFERENCES public.pesquisas(id) ON DELETE CASCADE NOT NULL,
  pergunta_id uuid REFERENCES public.pesquisas_perguntas(id) ON DELETE CASCADE NOT NULL,
  colaborador_id uuid REFERENCES public.colaboradores(id),
  valor_numerico int,
  valor_texto text,
  created_at timestamptz DEFAULT now()
);

-- ================================
-- 2. WORKFLOWS CONFIGURÁVEIS
-- ================================
CREATE TABLE IF NOT EXISTS public.workflows_definicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL,
  ativo boolean DEFAULT true,
  empresa_id uuid REFERENCES public.empresas(id),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflows_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.workflows_definicoes(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  tipo text DEFAULT 'aprovacao',
  ordem int NOT NULL,
  aprovador_tipo text,
  aprovador_id uuid,
  config jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflows_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.workflows_definicoes(id) NOT NULL,
  etapa_atual_id uuid REFERENCES public.workflows_etapas(id),
  entidade_tipo text NOT NULL,
  entidade_id uuid NOT NULL,
  status text DEFAULT 'pendente',
  solicitante_id uuid,
  dados jsonb,
  empresa_id uuid REFERENCES public.empresas(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflows_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execucao_id uuid REFERENCES public.workflows_execucoes(id) ON DELETE CASCADE NOT NULL,
  etapa_id uuid REFERENCES public.workflows_etapas(id),
  acao text NOT NULL,
  usuario_id uuid,
  observacoes text,
  created_at timestamptz DEFAULT now()
);

-- ================================
-- 3. TURNOS E ESCALAS DE TRABALHO
-- ================================
CREATE TABLE IF NOT EXISTS public.turnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  horario_inicio time NOT NULL,
  horario_fim time NOT NULL,
  intervalo_minutos int DEFAULT 60,
  cor text,
  ativo boolean DEFAULT true,
  empresa_id uuid REFERENCES public.empresas(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.escalas_trabalho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE CASCADE NOT NULL,
  turno_id uuid REFERENCES public.turnos(id) NOT NULL,
  data date NOT NULL,
  status text DEFAULT 'agendado',
  observacoes text,
  empresa_id uuid REFERENCES public.empresas(id),
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- ================================
-- 4. COMUNICAÇÃO INTERNA (extend comunicados + canal de ética)
-- ================================
CREATE TABLE IF NOT EXISTS public.comunicados_leituras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comunicado_id uuid REFERENCES public.comunicados(id) ON DELETE CASCADE NOT NULL,
  usuario_id uuid NOT NULL,
  lido_em timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.canal_etica (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo text NOT NULL DEFAULT substring(gen_random_uuid()::text from 1 for 8),
  categoria text NOT NULL,
  descricao text NOT NULL,
  anonimo boolean DEFAULT true,
  status text DEFAULT 'aberto',
  prioridade text DEFAULT 'media',
  resposta text,
  empresa_id uuid REFERENCES public.empresas(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================
-- 5. GESTÃO DE DESPESAS
-- ================================
CREATE TABLE IF NOT EXISTS public.despesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid REFERENCES public.colaboradores(id) NOT NULL,
  categoria text NOT NULL,
  descricao text NOT NULL,
  valor numeric(10,2) NOT NULL,
  data_despesa date NOT NULL,
  comprovante_url text,
  status text DEFAULT 'pendente',
  aprovado_por uuid,
  aprovado_em timestamptz,
  observacoes text,
  observacoes_aprovador text,
  empresa_id uuid REFERENCES public.empresas(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================
-- 6. CONTROLE DE PRESENÇA / ACESSO
-- ================================
CREATE TABLE IF NOT EXISTS public.controle_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid REFERENCES public.colaboradores(id) NOT NULL,
  tipo text NOT NULL,
  metodo text DEFAULT 'manual',
  local text,
  area text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  ip_address text,
  dispositivo text,
  empresa_id uuid REFERENCES public.empresas(id),
  created_at timestamptz DEFAULT now()
);

-- ================================
-- 7. LGPD
-- ================================
CREATE TABLE IF NOT EXISTS public.lgpd_consentimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid REFERENCES public.colaboradores(id) NOT NULL,
  tipo text NOT NULL,
  aceito boolean DEFAULT false,
  versao text DEFAULT '1.0',
  ip_address text,
  aceito_em timestamptz,
  revogado_em timestamptz,
  empresa_id uuid REFERENCES public.empresas(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lgpd_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid REFERENCES public.colaboradores(id),
  tipo text NOT NULL,
  status text DEFAULT 'pendente',
  descricao text,
  resposta text,
  prazo_legal date,
  concluida_em timestamptz,
  responsavel_id uuid,
  empresa_id uuid REFERENCES public.empresas(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================
-- 8. CATÁLOGO DE CURSOS / TRILHAS (Enhancement Treinamentos)
-- ================================
CREATE TABLE IF NOT EXISTS public.catalogo_cursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  categoria text,
  carga_horaria int,
  modalidade text DEFAULT 'presencial',
  obrigatorio boolean DEFAULT false,
  nr_relacionada text,
  ativo boolean DEFAULT true,
  empresa_id uuid REFERENCES public.empresas(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trilhas_aprendizado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  nivel text DEFAULT 'basico',
  ativo boolean DEFAULT true,
  empresa_id uuid REFERENCES public.empresas(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trilhas_cursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trilha_id uuid REFERENCES public.trilhas_aprendizado(id) ON DELETE CASCADE NOT NULL,
  curso_id uuid REFERENCES public.catalogo_cursos(id) ON DELETE CASCADE NOT NULL,
  ordem int DEFAULT 0,
  obrigatorio boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.inscricoes_cursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id uuid REFERENCES public.catalogo_cursos(id) NOT NULL,
  colaborador_id uuid REFERENCES public.colaboradores(id) NOT NULL,
  status text DEFAULT 'inscrito',
  nota numeric(5,2),
  data_inicio date,
  data_conclusao date,
  certificado_url text,
  empresa_id uuid REFERENCES public.empresas(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================
-- RLS FOR ALL NEW TABLES
-- ================================
ALTER TABLE public.pesquisas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesquisas_perguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesquisas_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows_definicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows_execucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalas_trabalho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados_leituras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canal_etica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controle_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_consentimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogo_cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trilhas_aprendizado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trilhas_cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscricoes_cursos ENABLE ROW LEVEL SECURITY;

-- ================================
-- RLS POLICIES
-- ================================
DROP POLICY IF EXISTS "auth_pesquisas_all" ON public.pesquisas;
CREATE POLICY "auth_pesquisas_all" ON public.pesquisas FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_pesquisas_perguntas_all" ON public.pesquisas_perguntas;
CREATE POLICY "auth_pesquisas_perguntas_all" ON public.pesquisas_perguntas FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_pesquisas_respostas_all" ON public.pesquisas_respostas;
CREATE POLICY "auth_pesquisas_respostas_all" ON public.pesquisas_respostas FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_workflows_def_all" ON public.workflows_definicoes;
CREATE POLICY "auth_workflows_def_all" ON public.workflows_definicoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_workflows_etapas_all" ON public.workflows_etapas;
CREATE POLICY "auth_workflows_etapas_all" ON public.workflows_etapas FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_workflows_exec_all" ON public.workflows_execucoes;
CREATE POLICY "auth_workflows_exec_all" ON public.workflows_execucoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_workflows_hist_all" ON public.workflows_historico;
CREATE POLICY "auth_workflows_hist_all" ON public.workflows_historico FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_turnos_all" ON public.turnos;
CREATE POLICY "auth_turnos_all" ON public.turnos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_escalas_trabalho_all" ON public.escalas_trabalho;
CREATE POLICY "auth_escalas_trabalho_all" ON public.escalas_trabalho FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_comunicados_leituras_all" ON public.comunicados_leituras;
CREATE POLICY "auth_comunicados_leituras_all" ON public.comunicados_leituras FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_canal_etica_all" ON public.canal_etica;
CREATE POLICY "auth_canal_etica_all" ON public.canal_etica FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_despesas_all" ON public.despesas;
CREATE POLICY "auth_despesas_all" ON public.despesas FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_controle_acesso_all" ON public.controle_acesso;
CREATE POLICY "auth_controle_acesso_all" ON public.controle_acesso FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_lgpd_consentimentos_all" ON public.lgpd_consentimentos;
CREATE POLICY "auth_lgpd_consentimentos_all" ON public.lgpd_consentimentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_lgpd_solicitacoes_all" ON public.lgpd_solicitacoes;
CREATE POLICY "auth_lgpd_solicitacoes_all" ON public.lgpd_solicitacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_catalogo_cursos_all" ON public.catalogo_cursos;
CREATE POLICY "auth_catalogo_cursos_all" ON public.catalogo_cursos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_trilhas_all" ON public.trilhas_aprendizado;
CREATE POLICY "auth_trilhas_all" ON public.trilhas_aprendizado FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_trilhas_cursos_all" ON public.trilhas_cursos;
CREATE POLICY "auth_trilhas_cursos_all" ON public.trilhas_cursos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_inscricoes_all" ON public.inscricoes_cursos;
CREATE POLICY "auth_inscricoes_all" ON public.inscricoes_cursos FOR ALL TO authenticated USING (true) WITH CHECK (true);
