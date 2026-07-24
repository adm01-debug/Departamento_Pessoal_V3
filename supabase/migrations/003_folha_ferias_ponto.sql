-- V16-003: Folha, Férias, Ponto Schema

-- RUBRICAS (Verbas da Folha)
CREATE TABLE IF NOT EXISTS rubricas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  codigo VARCHAR(10) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL, -- provento, desconto, informativo
  incide_inss BOOLEAN DEFAULT false,
  incide_irrf BOOLEAN DEFAULT false,
  incide_fgts BOOLEAN DEFAULT false,
  natureza_rubrica VARCHAR(10),
  formula TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FOLHA PAGAMENTO (Cabeçalho)
CREATE TABLE IF NOT EXISTS folha_pagamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  competencia CHAR(7) NOT NULL, -- YYYY-MM
  tipo VARCHAR(20) DEFAULT 'mensal', -- mensal, adiantamento, 13_1, 13_2, ferias, rescisao
  data_calculo DATE,
  data_pagamento DATE,
  total_proventos DECIMAL(15,2) DEFAULT 0,
  total_descontos DECIMAL(15,2) DEFAULT 0,
  total_liquido DECIMAL(15,2) DEFAULT 0,
  total_encargos DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'aberta', -- aberta, calculada, fechada, paga
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FOLHA ITENS (Lançamentos por colaborador)
CREATE TABLE IF NOT EXISTS folha_itens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folha_id UUID NOT NULL REFERENCES folha_pagamento(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id),
  rubrica_id UUID REFERENCES rubricas(id),
  referencia DECIMAL(10,2),
  valor DECIMAL(12,2) NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FERIAS
CREATE TABLE IF NOT EXISTS ferias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  periodo_aquisitivo_inicio DATE NOT NULL,
  periodo_aquisitivo_fim DATE NOT NULL,
  periodo_gozo_inicio DATE,
  periodo_gozo_fim DATE,
  dias_gozo INTEGER DEFAULT 30,
  dias_abono INTEGER DEFAULT 0,
  dias_vendidos INTEGER DEFAULT 0,
  valor_ferias DECIMAL(12,2),
  valor_1_3 DECIMAL(12,2),
  valor_abono DECIMAL(12,2),
  valor_adiantamento_13 DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'pendente', -- pendente, programada, em_gozo, concluida, vencida
  data_pagamento DATE,
  observacoes TEXT,
  aprovado_por UUID REFERENCES colaboradores(id),
  aprovado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PONTO (Registros)
CREATE TABLE IF NOT EXISTS ponto_registros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  entrada_1 TIME,
  saida_1 TIME,
  entrada_2 TIME,
  saida_2 TIME,
  entrada_3 TIME,
  saida_3 TIME,
  horas_trabalhadas INTERVAL,
  horas_extras INTERVAL,
  horas_falta INTERVAL,
  atraso INTERVAL,
  tipo VARCHAR(20) DEFAULT 'normal', -- normal, falta, folga, feriado, ferias, afastamento
  justificativa TEXT,
  abonado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BANCO DE HORAS
CREATE TABLE IF NOT EXISTS banco_horas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo VARCHAR(20) NOT NULL, -- credito, debito
  horas INTERVAL NOT NULL,
  motivo TEXT,
  saldo_anterior INTERVAL,
  saldo_atual INTERVAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_folha_empresa ON folha_pagamento(empresa_id);
CREATE INDEX IF NOT EXISTS idx_folha_competencia ON folha_pagamento(competencia);
CREATE INDEX IF NOT EXISTS idx_folha_itens_folha ON folha_itens(folha_id);
CREATE INDEX IF NOT EXISTS idx_ferias_colab ON ferias(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_ferias_status ON ferias(status);
CREATE INDEX IF NOT EXISTS idx_ponto_colab ON ponto_registros(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_ponto_data ON ponto_registros(data);
