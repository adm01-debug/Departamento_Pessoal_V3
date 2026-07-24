-- Tipos de afastamento
DO $$ BEGIN
CREATE TYPE public.tipo_afastamento AS ENUM (
  'doenca',
  'acidente_trabalho',
  'acidente_trajeto',
  'licenca_maternidade',
  'licenca_paternidade',
  'licenca_casamento',
  'licenca_obito',
  'licenca_nao_remunerada',
  'servico_militar',
  'mandato_sindical',
  'suspensao_disciplinar',
  'outros'
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Status do afastamento
DO $$ BEGIN
CREATE TYPE public.status_afastamento AS ENUM (
  'ativo',
  'encerrado',
  'cancelado',
  'prorrogado'
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela principal de afastamentos
CREATE TABLE IF NOT EXISTS public.afastamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo tipo_afastamento NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim_prevista DATE NOT NULL,
  data_fim_real DATE,
  dias_empresa INTEGER DEFAULT 0,
  dias_inss INTEGER DEFAULT 0,
  dias_total INTEGER GENERATED ALWAYS AS (COALESCE(dias_empresa, 0) + COALESCE(dias_inss, 0)) STORED,
  cid VARCHAR(10),
  cid_descricao VARCHAR(255),
  numero_beneficio VARCHAR(20),
  data_pericia DATE,
  medico_nome VARCHAR(100),
  medico_crm VARCHAR(20),
  atestado_numero VARCHAR(50),
  observacoes TEXT,
  status status_afastamento DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de prorrogações
CREATE TABLE IF NOT EXISTS public.prorrogacoes_afastamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  afastamento_id UUID NOT NULL REFERENCES public.afastamentos(id) ON DELETE CASCADE,
  data_fim_anterior DATE NOT NULL,
  data_fim_nova DATE NOT NULL,
  dias_adicionais INTEGER NOT NULL,
  motivo TEXT,
  numero_beneficio_novo VARCHAR(20),
  data_pericia DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Tabela de documentos de afastamento
CREATE TABLE IF NOT EXISTS public.documentos_afastamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  afastamento_id UUID NOT NULL REFERENCES public.afastamentos(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.afastamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prorrogacoes_afastamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_afastamento ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Authenticated users can manage afastamentos" ON public.afastamentos;
CREATE POLICY "Authenticated users can manage afastamentos" ON public.afastamentos FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can manage prorrogacoes" ON public.prorrogacoes_afastamento;
CREATE POLICY "Authenticated users can manage prorrogacoes" ON public.prorrogacoes_afastamento FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can manage docs_afastamento" ON public.documentos_afastamento;
CREATE POLICY "Authenticated users can manage docs_afastamento" ON public.documentos_afastamento FOR ALL USING (true) WITH CHECK (true);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_afastamentos_updated_at ON public.afastamentos;
CREATE TRIGGER update_afastamentos_updated_at
  BEFORE UPDATE ON public.afastamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de configurações de afastamentos (dias por tipo)
CREATE TABLE IF NOT EXISTS public.config_afastamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo tipo_afastamento NOT NULL UNIQUE,
  dias_empresa_maximo INTEGER DEFAULT 15,
  dias_minimos INTEGER DEFAULT 1,
  dias_maximos INTEGER,
  pago_empresa BOOLEAN DEFAULT true,
  pago_inss BOOLEAN DEFAULT false,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.config_afastamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view config_afastamentos" ON public.config_afastamentos;
CREATE POLICY "Authenticated users can view config_afastamentos" ON public.config_afastamentos FOR SELECT USING (true);

-- Inserir configurações padrão
INSERT INTO public.config_afastamentos (tipo, dias_empresa_maximo, dias_minimos, dias_maximos, pago_empresa, pago_inss, descricao) VALUES
  ('doenca', 15, 1, NULL, true, true, 'Afastamento por doença - empresa paga até 15 dias, após INSS'),
  ('acidente_trabalho', 15, 1, NULL, true, true, 'Acidente de trabalho - empresa paga até 15 dias, após INSS com estabilidade'),
  ('acidente_trajeto', 15, 1, NULL, true, true, 'Acidente de trajeto - equiparado a acidente de trabalho'),
  ('licenca_maternidade', 0, 120, 180, false, true, 'Licença maternidade - 120 dias (180 com Empresa Cidadã)'),
  ('licenca_paternidade', 5, 5, 20, true, false, 'Licença paternidade - 5 dias (20 com Empresa Cidadã)'),
  ('licenca_casamento', 3, 3, 3, true, false, 'Licença casamento - 3 dias consecutivos'),
  ('licenca_obito', 2, 2, 2, true, false, 'Licença óbito familiar - 2 dias consecutivos'),
  ('licenca_nao_remunerada', 0, 1, NULL, false, false, 'Licença não remunerada - sem pagamento'),
  ('servico_militar', 0, 1, NULL, false, false, 'Serviço militar obrigatório'),
  ('mandato_sindical', 0, 1, NULL, false, false, 'Mandato sindical'),
  ('suspensao_disciplinar', 0, 1, 30, false, false, 'Suspensão disciplinar - sem pagamento'),
  ('outros', 0, 1, NULL, false, false, 'Outros afastamentos');