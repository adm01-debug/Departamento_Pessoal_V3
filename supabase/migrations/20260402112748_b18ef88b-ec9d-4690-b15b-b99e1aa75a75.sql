
-- Tabela de Vagas
CREATE TABLE IF NOT EXISTS public.vagas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  departamento TEXT,
  cargo TEXT,
  tipo_contrato TEXT DEFAULT 'clt',
  modalidade TEXT DEFAULT 'presencial',
  faixa_salarial_min NUMERIC,
  faixa_salarial_max NUMERIC,
  quantidade INTEGER DEFAULT 1,
  requisitos TEXT,
  beneficios_oferecidos TEXT,
  status TEXT DEFAULT 'aberta',
  data_abertura DATE DEFAULT CURRENT_DATE,
  data_encerramento DATE,
  responsavel_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Candidatos
CREATE TABLE IF NOT EXISTS public.candidatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cpf TEXT,
  linkedin TEXT,
  curriculo_url TEXT,
  pretensao_salarial NUMERIC,
  experiencia_anos INTEGER,
  formacao TEXT,
  observacoes TEXT,
  origem TEXT DEFAULT 'site',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Pipeline (candidato x vaga)
CREATE TABLE IF NOT EXISTS public.candidaturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vaga_id UUID REFERENCES public.vagas(id) ON DELETE CASCADE NOT NULL,
  candidato_id UUID REFERENCES public.candidatos(id) ON DELETE CASCADE NOT NULL,
  etapa TEXT DEFAULT 'triagem',
  nota_geral NUMERIC,
  feedback TEXT,
  data_entrevista TIMESTAMP WITH TIME ZONE,
  entrevistador TEXT,
  status TEXT DEFAULT 'em_andamento',
  motivo_rejeicao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vaga_id, candidato_id)
);

-- RLS
ALTER TABLE public.vagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidaturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage vagas of their empresa" ON public.vagas;
CREATE POLICY "Users can manage vagas of their empresa" ON public.vagas
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Users can manage candidatos of their empresa" ON public.candidatos;
CREATE POLICY "Users can manage candidatos of their empresa" ON public.candidatos
  FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Users can manage candidaturas via vaga empresa" ON public.candidaturas;
CREATE POLICY "Users can manage candidaturas via vaga empresa" ON public.candidaturas
  FOR ALL TO authenticated
  USING (vaga_id IN (SELECT id FROM public.vagas WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- Triggers updated_at
DROP TRIGGER IF EXISTS set_vagas_updated_at ON public.vagas;
CREATE TRIGGER set_vagas_updated_at BEFORE UPDATE ON public.vagas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_candidatos_updated_at ON public.candidatos;
CREATE TRIGGER set_candidatos_updated_at BEFORE UPDATE ON public.candidatos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_candidaturas_updated_at ON public.candidaturas;
CREATE TRIGGER set_candidaturas_updated_at BEFORE UPDATE ON public.candidaturas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
