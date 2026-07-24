-- Enum para tipos de desligamento
DO $$ BEGIN
CREATE TYPE public.tipo_desligamento AS ENUM (
  'sem_justa_causa',
  'justa_causa', 
  'pedido_demissao',
  'acordo',
  'fim_contrato',
  'falecimento'
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum para etapas de admissão
DO $$ BEGIN
CREATE TYPE public.etapa_admissao AS ENUM (
  'solicitacao',
  'documentos',
  'validacao',
  'pendente',
  'exame',
  'contrato',
  'assinatura',
  'esocial'
);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela de admissões
CREATE TABLE IF NOT EXISTS public.admissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  departamento TEXT NOT NULL,
  salario_proposto NUMERIC NOT NULL,
  data_prevista DATE NOT NULL,
  etapa etapa_admissao NOT NULL DEFAULT 'solicitacao',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Checklist items
  checklist_documentos_pessoais BOOLEAN DEFAULT false,
  checklist_comprovante_endereco BOOLEAN DEFAULT false,
  checklist_foto BOOLEAN DEFAULT false,
  checklist_ctps BOOLEAN DEFAULT false,
  checklist_exame_admissional BOOLEAN DEFAULT false,
  checklist_contrato_assinado BOOLEAN DEFAULT false,
  checklist_esocial_enviado BOOLEAN DEFAULT false
);

-- Tabela de desligamentos
CREATE TABLE IF NOT EXISTS public.desligamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo tipo_desligamento NOT NULL,
  data_desligamento DATE NOT NULL,
  data_aviso DATE,
  motivo TEXT,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  
  -- Valores de rescisão
  salario_base NUMERIC NOT NULL DEFAULT 0,
  saldo_salario NUMERIC DEFAULT 0,
  aviso_previo NUMERIC DEFAULT 0,
  ferias_vencidas NUMERIC DEFAULT 0,
  ferias_proporcionais NUMERIC DEFAULT 0,
  terco_constitucional NUMERIC DEFAULT 0,
  decimo_terceiro NUMERIC DEFAULT 0,
  multa_fgts NUMERIC DEFAULT 0,
  total_proventos NUMERIC DEFAULT 0,
  total_descontos NUMERIC DEFAULT 0,
  valor_liquido NUMERIC DEFAULT 0,
  
  -- Checklist items
  checklist_comunicacao BOOLEAN DEFAULT false,
  checklist_documentacao BOOLEAN DEFAULT false,
  checklist_calculo_rescisao BOOLEAN DEFAULT false,
  checklist_homologacao BOOLEAN DEFAULT false,
  checklist_revogacao_acessos BOOLEAN DEFAULT false,
  checklist_devolucao_equipamentos BOOLEAN DEFAULT false,
  checklist_esocial BOOLEAN DEFAULT false,
  checklist_pagamento BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.admissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desligamentos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admissoes
DROP POLICY IF EXISTS "Authenticated users can view admissoes" ON public.admissoes;
CREATE POLICY "Authenticated users can view admissoes"
ON public.admissoes FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert admissoes" ON public.admissoes;
CREATE POLICY "Authenticated users can insert admissoes"
ON public.admissoes FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update admissoes" ON public.admissoes;
CREATE POLICY "Authenticated users can update admissoes"
ON public.admissoes FOR UPDATE
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete admissoes" ON public.admissoes;
CREATE POLICY "Authenticated users can delete admissoes"
ON public.admissoes FOR DELETE
USING (auth.role() = 'authenticated');

-- RLS Policies for desligamentos
DROP POLICY IF EXISTS "Authenticated users can view desligamentos" ON public.desligamentos;
CREATE POLICY "Authenticated users can view desligamentos"
ON public.desligamentos FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert desligamentos" ON public.desligamentos;
CREATE POLICY "Authenticated users can insert desligamentos"
ON public.desligamentos FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update desligamentos" ON public.desligamentos;
CREATE POLICY "Authenticated users can update desligamentos"
ON public.desligamentos FOR UPDATE
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete desligamentos" ON public.desligamentos;
CREATE POLICY "Authenticated users can delete desligamentos"
ON public.desligamentos FOR DELETE
USING (auth.role() = 'authenticated');

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_admissoes_updated_at ON public.admissoes;
CREATE TRIGGER update_admissoes_updated_at
BEFORE UPDATE ON public.admissoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_desligamentos_updated_at ON public.desligamentos;
CREATE TRIGGER update_desligamentos_updated_at
BEFORE UPDATE ON public.desligamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();