CREATE TABLE IF NOT EXISTS public.historico_rescisoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.empresas(id),
  created_by UUID,
  nome_colaborador TEXT,
  cpf TEXT,
  cargo TEXT,
  salario NUMERIC NOT NULL,
  data_admissao DATE NOT NULL,
  data_desligamento DATE NOT NULL,
  tipo_rescisao TEXT NOT NULL,
  aviso_trabalhado BOOLEAN DEFAULT false,
  ferias_vencidas BOOLEAN DEFAULT false,
  saldo_fgts NUMERIC DEFAULT 0,
  total_proventos NUMERIC,
  total_descontos NUMERIC,
  total_liquido NUMERIC,
  resultado JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_rescisoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados podem inserir rescisoes" ON public.historico_rescisoes;
CREATE POLICY "Usuarios autenticados podem inserir rescisoes"
  ON public.historico_rescisoes FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados podem ver rescisoes" ON public.historico_rescisoes;
CREATE POLICY "Usuarios autenticados podem ver rescisoes"
  ON public.historico_rescisoes FOR SELECT TO authenticated
  USING (true);