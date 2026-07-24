-- Enum para tipos de evento (idempotent)
DO $$ BEGIN CREATE TYPE public.tipo_evento_folha AS ENUM ('provento', 'desconto', 'informativo'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.status_folha AS ENUM ('aberta', 'calculada', 'fechada', 'paga'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela de rubricas/eventos (catálogo de eventos)
CREATE TABLE IF NOT EXISTS public.rubricas_folha (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  tipo tipo_evento_folha NOT NULL,
  incide_inss BOOLEAN DEFAULT false,
  incide_irrf BOOLEAN DEFAULT false,
  incide_fgts BOOLEAN DEFAULT false,
  automatico BOOLEAN DEFAULT false,
  formula TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir rubricas padrão (idempotent)
INSERT INTO public.rubricas_folha (codigo, descricao, tipo, incide_inss, incide_irrf, incide_fgts, automatico) VALUES
('001', 'Salário Base', 'provento', true, true, true, true),
('002', 'Horas Extras 50%', 'provento', true, true, true, false),
('003', 'Horas Extras 100%', 'provento', true, true, true, false),
('004', 'Adicional Noturno', 'provento', true, true, true, false),
('005', 'DSR s/ Horas Extras', 'provento', true, true, true, true),
('006', 'Comissões', 'provento', true, true, true, false),
('007', 'Gratificação', 'provento', true, true, true, false),
('008', 'Adicional Insalubridade', 'provento', true, true, true, false),
('009', 'Adicional Periculosidade', 'provento', true, true, true, false),
('010', 'Vale Transporte', 'provento', false, false, false, false),
('011', 'Vale Alimentação', 'provento', false, false, false, false),
('012', 'Férias', 'provento', true, true, true, false),
('013', '1/3 Férias', 'provento', true, true, true, false),
('014', '13º Salário', 'provento', true, true, true, false),
('050', 'INSS', 'desconto', false, false, false, true),
('051', 'IRRF', 'desconto', false, false, false, true),
('052', 'Vale Transporte Desconto', 'desconto', false, false, false, false),
('053', 'Vale Alimentação Desconto', 'desconto', false, false, false, false),
('054', 'Faltas', 'desconto', false, false, false, false),
('055', 'Atrasos', 'desconto', false, false, false, false),
('056', 'Adiantamento', 'desconto', false, false, false, false),
('057', 'Empréstimo Consignado', 'desconto', false, false, false, false),
('058', 'Pensão Alimentícia', 'desconto', false, false, false, false),
('059', 'Plano de Saúde', 'desconto', false, false, false, false),
('060', 'Plano Odontológico', 'desconto', false, false, false, false),
('090', 'Base INSS', 'informativo', false, false, false, true),
('091', 'Base IRRF', 'informativo', false, false, false, true),
('092', 'Base FGTS', 'informativo', false, false, false, true),
('093', 'FGTS do Mês', 'informativo', false, false, false, true)
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE public.rubricas_folha ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Authenticated users can view rubricas" ON public.rubricas_folha FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Authenticated users can manage rubricas" ON public.rubricas_folha FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela de folhas de pagamento (competências)
CREATE TABLE IF NOT EXISTS public.folhas_pagamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competencia TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'mensal',
  status status_folha NOT NULL DEFAULT 'aberta',
  data_calculo TIMESTAMP WITH TIME ZONE,
  data_fechamento TIMESTAMP WITH TIME ZONE,
  data_pagamento DATE,
  total_proventos DECIMAL(14,2) DEFAULT 0,
  total_descontos DECIMAL(14,2) DEFAULT 0,
  total_liquido DECIMAL(14,2) DEFAULT 0,
  total_fgts DECIMAL(14,2) DEFAULT 0,
  total_inss_patronal DECIMAL(14,2) DEFAULT 0,
  total_colaboradores INTEGER DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(competencia, tipo)
);

ALTER TABLE public.folhas_pagamento ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Authenticated users can manage folhas" ON public.folhas_pagamento FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TRIGGER IF EXISTS update_folhas_pagamento_updated_at ON public.folhas_pagamento;
CREATE TRIGGER update_folhas_pagamento_updated_at
BEFORE UPDATE ON public.folhas_pagamento
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de holerites (resultado por colaborador)
CREATE TABLE IF NOT EXISTS public.holerites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folha_id UUID NOT NULL REFERENCES public.folhas_pagamento(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  colaborador_nome TEXT NOT NULL,
  colaborador_cpf TEXT NOT NULL,
  colaborador_cargo TEXT NOT NULL,
  colaborador_departamento TEXT NOT NULL,
  colaborador_matricula TEXT,
  salario_base DECIMAL(12,2) NOT NULL,
  total_proventos DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_descontos DECIMAL(12,2) NOT NULL DEFAULT 0,
  liquido DECIMAL(12,2) NOT NULL DEFAULT 0,
  base_inss DECIMAL(12,2) DEFAULT 0,
  base_irrf DECIMAL(12,2) DEFAULT 0,
  base_fgts DECIMAL(12,2) DEFAULT 0,
  valor_inss DECIMAL(12,2) DEFAULT 0,
  valor_irrf DECIMAL(12,2) DEFAULT 0,
  valor_fgts DECIMAL(12,2) DEFAULT 0,
  dependentes_irrf INTEGER DEFAULT 0,
  faltas_dias DECIMAL(5,2) DEFAULT 0,
  horas_extras_50 DECIMAL(6,2) DEFAULT 0,
  horas_extras_100 DECIMAL(6,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(folha_id, colaborador_id)
);

ALTER TABLE public.holerites ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Authenticated users can manage holerites" ON public.holerites FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela de lançamentos (eventos do holerite)
CREATE TABLE IF NOT EXISTS public.lancamentos_folha (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  holerite_id UUID NOT NULL REFERENCES public.holerites(id) ON DELETE CASCADE,
  rubrica_id UUID NOT NULL REFERENCES public.rubricas_folha(id),
  rubrica_codigo TEXT NOT NULL,
  rubrica_descricao TEXT NOT NULL,
  tipo tipo_evento_folha NOT NULL,
  referencia DECIMAL(10,2),
  valor DECIMAL(12,2) NOT NULL,
  automatico BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lancamentos_folha ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Authenticated users can manage lancamentos" ON public.lancamentos_folha FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela de eventos variáveis (lançamentos antes do cálculo)
CREATE TABLE IF NOT EXISTS public.eventos_variaveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competencia TEXT NOT NULL,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  rubrica_id UUID NOT NULL REFERENCES public.rubricas_folha(id),
  referencia DECIMAL(10,2),
  valor DECIMAL(12,2) NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.eventos_variaveis ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Authenticated users can manage eventos_variaveis" ON public.eventos_variaveis FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela de parâmetros fiscais (tabelas INSS, IRRF)
CREATE TABLE IF NOT EXISTS public.parametros_fiscais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  vigencia_inicio DATE NOT NULL,
  vigencia_fim DATE,
  faixa INTEGER,
  valor_inicial DECIMAL(12,2),
  valor_final DECIMAL(12,2),
  aliquota DECIMAL(6,4),
  deducao DECIMAL(12,2),
  valor_fixo DECIMAL(12,2),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir tabela INSS 2024 (idempotent)
INSERT INTO public.parametros_fiscais (tipo, vigencia_inicio, faixa, valor_inicial, valor_final, aliquota) VALUES
('inss', '2024-01-01', 1, 0, 1412.00, 0.075),
('inss', '2024-01-01', 2, 1412.01, 2666.68, 0.09),
('inss', '2024-01-01', 3, 2666.69, 4000.03, 0.12),
('inss', '2024-01-01', 4, 4000.04, 7786.02, 0.14)
ON CONFLICT DO NOTHING;

INSERT INTO public.parametros_fiscais (tipo, vigencia_inicio, faixa, valor_inicial, valor_final, aliquota, deducao) VALUES
('irrf', '2024-01-01', 1, 0, 2259.20, 0, 0),
('irrf', '2024-01-01', 2, 2259.21, 2826.65, 0.075, 169.44),
('irrf', '2024-01-01', 3, 2826.66, 3751.05, 0.15, 381.44),
('irrf', '2024-01-01', 4, 3751.06, 4664.68, 0.225, 662.77),
('irrf', '2024-01-01', 5, 4664.69, 999999999, 0.275, 896.00)
ON CONFLICT DO NOTHING;

INSERT INTO public.parametros_fiscais (tipo, vigencia_inicio, valor_fixo) VALUES
('salario_minimo', '2024-01-01', 1412.00),
('teto_inss', '2024-01-01', 7786.02),
('deducao_dependente_irrf', '2024-01-01', 189.59)
ON CONFLICT DO NOTHING;

ALTER TABLE public.parametros_fiscais ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "Authenticated users can view parametros" ON public.parametros_fiscais FOR SELECT TO authenticated USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
