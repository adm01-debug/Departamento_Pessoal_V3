-- Tabela de períodos aquisitivos de férias
CREATE TABLE IF NOT EXISTS public.periodos_aquisitivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  numero_periodo INTEGER NOT NULL DEFAULT 1,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias_direito INTEGER NOT NULL DEFAULT 30,
  faltas_periodo INTEGER DEFAULT 0,
  dias_descontados INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'em_aquisicao' CHECK (status IN ('em_aquisicao', 'adquirido', 'vencido', 'gozado', 'pago')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(colaborador_id, numero_periodo)
);

-- Tabela de programação/solicitação de férias
CREATE TABLE IF NOT EXISTS public.ferias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  periodo_aquisitivo_id UUID REFERENCES public.periodos_aquisitivos(id),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias_gozo INTEGER NOT NULL,
  dias_abono INTEGER DEFAULT 0,
  vender_abono BOOLEAN DEFAULT false,
  data_pagamento DATE,
  salario_base NUMERIC(12,2) NOT NULL,
  valor_ferias NUMERIC(12,2) NOT NULL,
  valor_terco NUMERIC(12,2) NOT NULL,
  valor_abono NUMERIC(12,2) DEFAULT 0,
  valor_terco_abono NUMERIC(12,2) DEFAULT 0,
  valor_total NUMERIC(12,2) NOT NULL,
  descontos_inss NUMERIC(12,2) DEFAULT 0,
  descontos_irrf NUMERIC(12,2) DEFAULT 0,
  valor_liquido NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'programada' CHECK (status IN ('programada', 'aprovada', 'em_gozo', 'concluida', 'cancelada')),
  aprovado_por UUID,
  aprovado_em TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de histórico de férias (para auditoria)
CREATE TABLE IF NOT EXISTS public.historico_ferias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ferias_id UUID NOT NULL REFERENCES public.ferias(id) ON DELETE CASCADE,
  status_anterior VARCHAR(20),
  status_novo VARCHAR(20) NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.periodos_aquisitivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_ferias ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Authenticated users can manage periodos_aquisitivos" ON public.periodos_aquisitivos;
CREATE POLICY "Authenticated users can manage periodos_aquisitivos" ON public.periodos_aquisitivos FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can manage ferias" ON public.ferias;
CREATE POLICY "Authenticated users can manage ferias" ON public.ferias FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can manage historico_ferias" ON public.historico_ferias;
CREATE POLICY "Authenticated users can manage historico_ferias" ON public.historico_ferias FOR ALL USING (true) WITH CHECK (true);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_ferias_updated_at ON public.ferias;
CREATE TRIGGER update_ferias_updated_at
  BEFORE UPDATE ON public.ferias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para calcular dias de direito baseado em faltas (CLT Art. 130)
CREATE OR REPLACE FUNCTION public.calcular_dias_ferias(faltas INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF faltas <= 5 THEN
    RETURN 30;
  ELSIF faltas <= 14 THEN
    RETURN 24;
  ELSIF faltas <= 23 THEN
    RETURN 18;
  ELSIF faltas <= 32 THEN
    RETURN 12;
  ELSE
    RETURN 0; -- Perde direito a férias
  END IF;
END;
$$;