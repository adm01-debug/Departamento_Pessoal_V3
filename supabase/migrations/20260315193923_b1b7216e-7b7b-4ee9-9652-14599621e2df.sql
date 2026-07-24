
-- =============================================
-- GAP 2: Contatos de Emergência
-- =============================================
CREATE TABLE IF NOT EXISTS public.contatos_emergencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  parentesco TEXT,
  telefone TEXT,
  celular TEXT,
  telefone_trabalho TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contatos_emergencia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage contatos_emergencia" ON public.contatos_emergencia;
CREATE POLICY "Authenticated users can manage contatos_emergencia"
ON public.contatos_emergencia FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- GAP 3: Histórico Salarial
-- =============================================
CREATE TABLE IF NOT EXISTS public.historico_salarial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id),
  salario_anterior NUMERIC(12,2),
  salario_novo NUMERIC(12,2) NOT NULL,
  cargo_anterior TEXT,
  cargo_novo TEXT,
  departamento_anterior TEXT,
  departamento_novo TEXT,
  motivo TEXT NOT NULL,
  descricao TEXT,
  data_vigencia DATE NOT NULL,
  vinculo_id TEXT,
  ativo BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_salarial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage historico_salarial" ON public.historico_salarial;
CREATE POLICY "Authenticated users can manage historico_salarial"
ON public.historico_salarial FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- GAP 4: Times/Equipes
-- =============================================
CREATE TABLE IF NOT EXISTS public.times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  departamento_id UUID REFERENCES public.departamentos(id),
  empresa_id UUID REFERENCES public.empresas(id),
  lider_id UUID REFERENCES public.colaboradores(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.times ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage times" ON public.times;
CREATE POLICY "Authenticated users can manage times"
ON public.times FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- GAP 5: Campos Customizados
-- =============================================
CREATE TABLE IF NOT EXISTS public.campos_customizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'texto',
  secao TEXT DEFAULT 'outras_informacoes',
  opcoes JSONB,
  obrigatorio BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.valores_campos_customizados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campo_customizado_id UUID NOT NULL REFERENCES public.campos_customizados(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  valor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campo_customizado_id, colaborador_id)
);

ALTER TABLE public.campos_customizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valores_campos_customizados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage campos_customizados" ON public.campos_customizados;
CREATE POLICY "Auth manage campos_customizados" ON public.campos_customizados FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Auth manage valores_campos" ON public.valores_campos_customizados;
CREATE POLICY "Auth manage valores_campos" ON public.valores_campos_customizados FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- GAP 6: Período de Experiência
-- =============================================
CREATE TABLE IF NOT EXISTS public.periodos_experiencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  primeira_etapa_fim DATE,
  segunda_etapa_fim DATE,
  dias_total INT DEFAULT 90,
  tipo TEXT DEFAULT '45+45',
  status TEXT DEFAULT 'em_andamento',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.periodos_experiencia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage periodos_experiencia" ON public.periodos_experiencia;
CREATE POLICY "Auth manage periodos_experiencia" ON public.periodos_experiencia FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- GAP 7: ASO
-- =============================================
CREATE TABLE IF NOT EXISTS public.asos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id),
  tipo TEXT NOT NULL,
  data_exame DATE NOT NULL,
  data_validade DATE,
  resultado TEXT DEFAULT 'apto',
  medico_nome TEXT,
  medico_crm TEXT,
  clinica TEXT,
  observacoes TEXT,
  arquivo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.asos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage asos" ON public.asos;
CREATE POLICY "Auth manage asos" ON public.asos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- GAP 8: Formações Acadêmicas
-- =============================================
CREATE TABLE IF NOT EXISTS public.formacoes_academicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo_escolaridade TEXT,
  curso TEXT,
  instituicao TEXT,
  ano_conclusao INT,
  situacao TEXT DEFAULT 'concluido',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.formacoes_academicas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage formacoes" ON public.formacoes_academicas;
CREATE POLICY "Auth manage formacoes" ON public.formacoes_academicas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- GAP 9: Dados de Estrangeiro
-- =============================================
CREATE TABLE IF NOT EXISTS public.dados_estrangeiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  pais_origem TEXT,
  tipo_visto TEXT,
  data_chegada DATE,
  data_naturalizacao DATE,
  casado_brasileiro BOOLEAN DEFAULT false,
  filho_brasileiro BOOLEAN DEFAULT false,
  tempo_residencia TEXT,
  condicao_ingresso TEXT,
  endereco_exterior TEXT,
  reside_brasil BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(colaborador_id)
);

ALTER TABLE public.dados_estrangeiro ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage dados_estrangeiro" ON public.dados_estrangeiro;
CREATE POLICY "Auth manage dados_estrangeiro" ON public.dados_estrangeiro FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- GAP 10: Deficiências (PCD)
-- =============================================
CREATE TABLE IF NOT EXISTS public.deficiencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  cid TEXT,
  descricao TEXT,
  observacoes TEXT,
  laudo_url TEXT,
  cota_pcd BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(colaborador_id)
);

ALTER TABLE public.deficiencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage deficiencias" ON public.deficiencias;
CREATE POLICY "Auth manage deficiencias" ON public.deficiencias FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- GAP 11: Webhooks
-- =============================================
CREATE TABLE IF NOT EXISTS public.webhooks_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  url TEXT NOT NULL,
  eventos TEXT[] NOT NULL DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  secret TEXT,
  ultimo_envio TIMESTAMPTZ,
  ultimo_status INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhooks_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES public.webhooks_config(id) ON DELETE CASCADE,
  evento TEXT NOT NULL,
  payload JSONB,
  status_code INT,
  resposta TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhooks_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage webhooks_config" ON public.webhooks_config;
CREATE POLICY "Auth manage webhooks_config" ON public.webhooks_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Auth manage webhooks_logs" ON public.webhooks_logs;
CREATE POLICY "Auth manage webhooks_logs" ON public.webhooks_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- GAP 12: Férias Coletivas
-- =============================================
CREATE TABLE IF NOT EXISTS public.ferias_coletivas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias INT NOT NULL,
  departamentos TEXT[],
  justificativa TEXT,
  status TEXT DEFAULT 'pendente',
  aprovado_por UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ferias_coletivas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage ferias_coletivas" ON public.ferias_coletivas;
CREATE POLICY "Auth manage ferias_coletivas" ON public.ferias_coletivas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- GAP 14: Anotações do Colaborador
-- =============================================
CREATE TABLE IF NOT EXISTS public.anotacoes_colaborador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  conteudo TEXT,
  data DATE DEFAULT CURRENT_DATE,
  tipo TEXT DEFAULT 'geral',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.anotacoes_colaborador ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth manage anotacoes" ON public.anotacoes_colaborador;
CREATE POLICY "Auth manage anotacoes" ON public.anotacoes_colaborador FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- GAP 15-16: Novos campos no colaborador
-- =============================================
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.colaboradores(id),
  ADD COLUMN IF NOT EXISTS time_id UUID,
  ADD COLUMN IF NOT EXISTS etnia TEXT,
  ADD COLUMN IF NOT EXISTS identidade_genero TEXT,
  ADD COLUMN IF NOT EXISTS tipo_admissao TEXT,
  ADD COLUMN IF NOT EXISTS tipo_estabilidade TEXT,
  ADD COLUMN IF NOT EXISTS primeiro_emprego BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cargo_confianca BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS aposentado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cipa BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_corporativo TEXT,
  ADD COLUMN IF NOT EXISTS inscricao_orgao_classe TEXT,
  ADD COLUMN IF NOT EXISTS conselho_profissional TEXT,
  ADD COLUMN IF NOT EXISTS seguro_desemprego BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_exame_admissional DATE,
  ADD COLUMN IF NOT EXISTS tipo_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS categoria_trabalhador TEXT;

-- =============================================
-- GAP 17: Etnias
-- =============================================
CREATE TABLE IF NOT EXISTS public.etnias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  codigo_esocial INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.etnias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read etnias" ON public.etnias;
CREATE POLICY "Read etnias" ON public.etnias FOR SELECT TO authenticated USING (true);

INSERT INTO public.etnias (nome, codigo_esocial) VALUES
  ('Indígena', 1), ('Branca', 2), ('Preta', 3), ('Amarela', 4), ('Parda', 5), ('Não informado', 6);

-- =============================================
-- GAP 18: Identidades de Gênero
-- =============================================
CREATE TABLE IF NOT EXISTS public.identidades_genero (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.identidades_genero ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read identidades_genero" ON public.identidades_genero;
CREATE POLICY "Read identidades_genero" ON public.identidades_genero FOR SELECT TO authenticated USING (true);

INSERT INTO public.identidades_genero (nome) VALUES
  ('Homem cisgênero'), ('Mulher cisgênero'), ('Homem transgênero'), ('Mulher transgênero'),
  ('Não-binário'), ('Agênero'), ('Gênero fluido'), ('Prefiro não informar');

-- =============================================
-- GAP 19: Tipos de Admissão
-- =============================================
CREATE TABLE IF NOT EXISTS public.tipos_admissao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  codigo_esocial INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tipos_admissao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read tipos_admissao" ON public.tipos_admissao;
CREATE POLICY "Read tipos_admissao" ON public.tipos_admissao FOR SELECT TO authenticated USING (true);

INSERT INTO public.tipos_admissao (nome, codigo_esocial) VALUES
  ('Admissão', 1), ('Transferência empresa mesmo grupo', 2), ('Transferência empresa consorciada', 3),
  ('Transferência por sucessão', 4), ('Readmissão', 5), ('Reconversão', 6);

-- =============================================
-- GAP 20: Tipos de Estabilidade
-- =============================================
CREATE TABLE IF NOT EXISTS public.tipos_estabilidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  duracao_meses INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tipos_estabilidade ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read tipos_estabilidade" ON public.tipos_estabilidade;
CREATE POLICY "Read tipos_estabilidade" ON public.tipos_estabilidade FOR SELECT TO authenticated USING (true);

INSERT INTO public.tipos_estabilidade (nome, descricao, duracao_meses) VALUES
  ('Acidente do Trabalho', 'Estabilidade de 12 meses após cessação do auxílio-doença acidentário', 12),
  ('Gestante', 'Da confirmação da gravidez até 5 meses após o parto', NULL),
  ('CIPA', 'Do registro da candidatura até 1 ano após o mandato', 12),
  ('Dirigente Sindical', 'A partir do registro da candidatura até 1 ano após o mandato', 12),
  ('Pré-aposentadoria', 'Conforme convenção coletiva', NULL),
  ('Acordo/Convenção Coletiva', 'Conforme instrumento coletivo', NULL),
  ('Membro Comissão de Conciliação', 'Até 1 ano após o final do mandato', 12);

-- Índices
CREATE INDEX IF NOT EXISTS idx_contatos_emergencia_col ON public.contatos_emergencia(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_historico_salarial_col ON public.historico_salarial(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_periodos_experiencia_col ON public.periodos_experiencia(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_asos_col ON public.asos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_formacoes_col ON public.formacoes_academicas(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_anotacoes_col ON public.anotacoes_colaborador(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_colab_supervisor ON public.colaboradores(supervisor_id);
