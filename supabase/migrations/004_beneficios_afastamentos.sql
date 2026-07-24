-- V16-004: Benefícios e Afastamentos Schema

-- BENEFICIOS (Tipos)
CREATE TABLE IF NOT EXISTS beneficios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- vale_transporte, vale_alimentacao, vale_refeicao, plano_saude, plano_odonto, seguro_vida, outros
  valor_padrao DECIMAL(12,2),
  desconto_percentual DECIMAL(5,2),
  desconto_valor DECIMAL(12,2),
  fornecedor VARCHAR(100),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- COLABORADOR_BENEFICIOS
CREATE TABLE IF NOT EXISTS colaborador_beneficios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  beneficio_id UUID NOT NULL REFERENCES beneficios(id) ON DELETE CASCADE,
  valor DECIMAL(12,2),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AFASTAMENTOS
CREATE TABLE IF NOT EXISTS afastamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- doenca, acidente_trabalho, licenca_maternidade, licenca_paternidade, outros
  motivo_esocial VARCHAR(10),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  data_retorno DATE,
  cid VARCHAR(10),
  atestado_numero VARCHAR(50),
  atestado_medico VARCHAR(100),
  atestado_crm VARCHAR(20),
  dias_afastamento INTEGER,
  prorrogacao BOOLEAN DEFAULT false,
  afastamento_original_id UUID REFERENCES afastamentos(id),
  observacoes TEXT,
  documento_url TEXT,
  status VARCHAR(20) DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FERIADOS
CREATE TABLE IF NOT EXISTS feriados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  descricao VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) DEFAULT 'nacional', -- nacional, estadual, municipal, ponte, compensado
  uf CHAR(2),
  cidade VARCHAR(100),
  recorrente BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENTOS (Admissões, Demissões, Promoções, etc)
CREATE TABLE IF NOT EXISTS eventos_rh (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- admissao, demissao, promocao, transferencia, alteracao_salarial, alteracao_cargo, advertencia, suspensao
  data_evento DATE NOT NULL,
  descricao TEXT,
  valor_anterior DECIMAL(12,2),
  valor_novo DECIMAL(12,2),
  cargo_anterior_id UUID REFERENCES cargos(id),
  cargo_novo_id UUID REFERENCES cargos(id),
  depto_anterior_id UUID REFERENCES departamentos(id),
  depto_novo_id UUID REFERENCES departamentos(id),
  motivo TEXT,
  documento_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_beneficios_empresa ON beneficios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_colab_benef_colab ON colaborador_beneficios(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_afastamentos_colab ON afastamentos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_afastamentos_status ON afastamentos(status);
CREATE INDEX IF NOT EXISTS idx_feriados_data ON feriados(data);
CREATE INDEX IF NOT EXISTS idx_eventos_colab ON eventos_rh(colaborador_id);
