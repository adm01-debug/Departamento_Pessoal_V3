-- Tabela de registros de ponto
CREATE TABLE IF NOT EXISTS public.registros_ponto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  entrada_1 TIME,
  saida_1 TIME,
  entrada_2 TIME,
  saida_2 TIME,
  entrada_3 TIME,
  saida_3 TIME,
  horas_trabalhadas INTERVAL,
  horas_extras INTERVAL DEFAULT '00:00:00',
  horas_falta INTERVAL DEFAULT '00:00:00',
  tipo_dia VARCHAR(20) DEFAULT 'normal' CHECK (tipo_dia IN ('normal', 'feriado', 'compensado', 'folga', 'falta', 'atestado', 'ferias', 'licenca')),
  justificativa TEXT,
  aprovado BOOLEAN DEFAULT false,
  aprovado_por UUID,
  aprovado_em TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(colaborador_id, data)
);

-- Tabela de banco de horas
CREATE TABLE IF NOT EXISTS public.banco_horas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('credito', 'debito')),
  horas INTERVAL NOT NULL,
  motivo TEXT,
  registro_ponto_id UUID REFERENCES public.registros_ponto(id),
  saldo_anterior INTERVAL DEFAULT '00:00:00',
  saldo_atual INTERVAL DEFAULT '00:00:00',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Tabela de ajustes de ponto
CREATE TABLE IF NOT EXISTS public.ajustes_ponto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_ponto_id UUID NOT NULL REFERENCES public.registros_ponto(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  campo_alterado VARCHAR(50) NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  motivo TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  aprovado_por UUID,
  aprovado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Tabela de períodos de ponto
CREATE TABLE IF NOT EXISTS public.periodos_ponto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competencia VARCHAR(7) NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado', 'processado')),
  fechado_em TIMESTAMP WITH TIME ZONE,
  fechado_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de feriados
CREATE TABLE IF NOT EXISTS public.feriados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL,
  descricao VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) DEFAULT 'nacional' CHECK (tipo IN ('nacional', 'estadual', 'municipal', 'facultativo')),
  uf VARCHAR(2),
  cidade VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banco_horas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ajustes_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Authenticated users can manage registros_ponto" ON public.registros_ponto;
CREATE POLICY "Authenticated users can manage registros_ponto" ON public.registros_ponto FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can manage banco_horas" ON public.banco_horas;
CREATE POLICY "Authenticated users can manage banco_horas" ON public.banco_horas FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can manage ajustes_ponto" ON public.ajustes_ponto;
CREATE POLICY "Authenticated users can manage ajustes_ponto" ON public.ajustes_ponto FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can manage periodos_ponto" ON public.periodos_ponto;
CREATE POLICY "Authenticated users can manage periodos_ponto" ON public.periodos_ponto FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can view feriados" ON public.feriados;
CREATE POLICY "Authenticated users can view feriados" ON public.feriados FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can manage feriados" ON public.feriados;
CREATE POLICY "Authenticated users can manage feriados" ON public.feriados FOR ALL USING (true) WITH CHECK (true);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_registros_ponto_updated_at ON public.registros_ponto;
CREATE TRIGGER update_registros_ponto_updated_at
  BEFORE UPDATE ON public.registros_ponto
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir feriados nacionais de 2024 e 2025
INSERT INTO public.feriados (data, descricao, tipo) VALUES
  ('2024-01-01', 'Confraternização Universal', 'nacional'),
  ('2024-02-12', 'Carnaval', 'nacional'),
  ('2024-02-13', 'Carnaval', 'nacional'),
  ('2024-03-29', 'Sexta-feira Santa', 'nacional'),
  ('2024-04-21', 'Tiradentes', 'nacional'),
  ('2024-05-01', 'Dia do Trabalho', 'nacional'),
  ('2024-05-30', 'Corpus Christi', 'nacional'),
  ('2024-09-07', 'Independência do Brasil', 'nacional'),
  ('2024-10-12', 'Nossa Senhora Aparecida', 'nacional'),
  ('2024-11-02', 'Finados', 'nacional'),
  ('2024-11-15', 'Proclamação da República', 'nacional'),
  ('2024-12-25', 'Natal', 'nacional'),
  ('2025-01-01', 'Confraternização Universal', 'nacional'),
  ('2025-03-03', 'Carnaval', 'nacional'),
  ('2025-03-04', 'Carnaval', 'nacional'),
  ('2025-04-18', 'Sexta-feira Santa', 'nacional'),
  ('2025-04-21', 'Tiradentes', 'nacional'),
  ('2025-05-01', 'Dia do Trabalho', 'nacional'),
  ('2025-06-19', 'Corpus Christi', 'nacional'),
  ('2025-09-07', 'Independência do Brasil', 'nacional'),
  ('2025-10-12', 'Nossa Senhora Aparecida', 'nacional'),
  ('2025-11-02', 'Finados', 'nacional'),
  ('2025-11-15', 'Proclamação da República', 'nacional'),
  ('2025-12-25', 'Natal', 'nacional');