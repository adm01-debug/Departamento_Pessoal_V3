-- Migration: Departamento Pessoal - Tabelas de Produção

-- Tabela de Colaboradores
CREATE TABLE IF NOT EXISTS public.colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  matricula TEXT UNIQUE,
  cpf TEXT UNIQUE NOT NULL,
  rg TEXT,
  cargo TEXT NOT NULL,
  departamento TEXT NOT NULL,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'ferias', 'afastado', 'desligado', 'admissao')),
  data_admissao DATE NOT NULL,
  data_demissao DATE,
  salario NUMERIC(10,2) NOT NULL,
  foto TEXT,
  gestor_id UUID REFERENCES public.colaboradores(id),
  email TEXT,
  telefone TEXT,
  endereco JSONB,
  dados_bancarios JSONB,
  dependentes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Férias
CREATE TABLE IF NOT EXISTS public.ferias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias INTEGER NOT NULL,
  tipo TEXT DEFAULT 'regular' CHECK (tipo IN ('regular', 'abono', 'coletiva')),
  status TEXT DEFAULT 'solicitada' CHECK (status IN ('solicitada', 'aprovada', 'em_andamento', 'concluida', 'cancelada')),
  aprovador_id UUID REFERENCES public.colaboradores(id),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Ponto
CREATE TABLE IF NOT EXISTS public.pontos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  entrada TIME,
  saida TIME,
  entrada_almoco TIME,
  saida_almoco TIME,
  horas_trabalhadas NUMERIC(4,2),
  horas_extras NUMERIC(4,2),
  status TEXT DEFAULT 'normal' CHECK (status IN ('normal', 'falta', 'atraso', 'hora_extra', 'justificado')),
  justificativa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(colaborador_id, data)
);

-- Tabela de Folha de Pagamento
CREATE TABLE IF NOT EXISTS public.folhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  mes_referencia TEXT NOT NULL, -- YYYY-MM
  salario_base NUMERIC(10,2) NOT NULL,
  horas_extras NUMERIC(10,2) DEFAULT 0,
  adicional_noturno NUMERIC(10,2) DEFAULT 0,
  comissoes NUMERIC(10,2) DEFAULT 0,
  descontos NUMERIC(10,2) DEFAULT 0,
  beneficios NUMERIC(10,2) DEFAULT 0,
  vale_transporte NUMERIC(10,2) DEFAULT 0,
  vale_refeicao NUMERIC(10,2) DEFAULT 0,
  inss NUMERIC(10,2) DEFAULT 0,
  irrf NUMERIC(10,2) DEFAULT 0,
  fgts NUMERIC(10,2) DEFAULT 0,
  liquido NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'calculada', 'aprovada', 'paga')),
  data_pagamento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(colaborador_id, mes_referencia)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_colaboradores_status ON public.colaboradores(status);
-- idx_colaboradores_depto removido: referenciava coluna inexistente; 002_colaboradores.sql já cria o índice correto.
CREATE INDEX IF NOT EXISTS idx_ferias_status ON public.ferias(status);
CREATE INDEX IF NOT EXISTS idx_pontos_data ON public.pontos(data);
CREATE INDEX IF NOT EXISTS idx_folhas_mes ON public.folhas(mes_referencia);

-- RLS
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folhas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.colaboradores;
CREATE POLICY "Allow all" ON public.colaboradores FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.ferias FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.pontos FOR ALL USING (true);
CREATE POLICY "Allow all" ON public.folhas FOR ALL USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_colaborador_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS colaboradores_updated_at ON public.colaboradores;
CREATE TRIGGER colaboradores_updated_at
  BEFORE UPDATE ON public.colaboradores
  FOR EACH ROW EXECUTE FUNCTION update_colaborador_updated_at();
