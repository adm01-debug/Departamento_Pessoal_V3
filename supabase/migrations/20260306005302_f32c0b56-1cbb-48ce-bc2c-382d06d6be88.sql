
-- Missing tables referenced in code but not in DB

-- 1. lotacoes (lotacaoService.ts)
CREATE TABLE IF NOT EXISTS public.lotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT,
  endereco TEXT,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lotacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage lotacoes" ON public.lotacoes;
CREATE POLICY "Auth users manage lotacoes" ON public.lotacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. jornadas (jornadaService.ts)
CREATE TABLE IF NOT EXISTS public.jornadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  nome TEXT NOT NULL,
  tipo TEXT DEFAULT 'padrao',
  carga_horaria_semanal INTEGER DEFAULT 44,
  horario_entrada TEXT,
  horario_saida TEXT,
  intervalo_minutos INTEGER DEFAULT 60,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage jornadas" ON public.jornadas;
CREATE POLICY "Auth users manage jornadas" ON public.jornadas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. exames (exameService.ts)
CREATE TABLE IF NOT EXISTS public.exames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  data_exame DATE,
  data_validade DATE,
  resultado TEXT,
  medico TEXT,
  crm TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exames ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage exames" ON public.exames;
CREATE POLICY "Auth users manage exames" ON public.exames FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. dctfweb_declaracoes (dctfwebService.ts)
CREATE TABLE IF NOT EXISTS public.dctfweb_declaracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  competencia TEXT NOT NULL,
  status TEXT DEFAULT 'pendente',
  data_geracao TIMESTAMPTZ DEFAULT now(),
  data_transmissao TIMESTAMPTZ,
  debitos JSONB DEFAULT '[]'::jsonb,
  total_debitos NUMERIC DEFAULT 0,
  total_remuneracao NUMERIC DEFAULT 0,
  total_fgts NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dctfweb_declaracoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage dctfweb" ON public.dctfweb_declaracoes;
CREATE POLICY "Auth users manage dctfweb" ON public.dctfweb_declaracoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. contratos (contratoService.ts)
CREATE TABLE IF NOT EXISTS public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo TEXT DEFAULT 'indeterminado',
  data_inicio DATE NOT NULL,
  data_fim DATE,
  status TEXT DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage contratos" ON public.contratos;
CREATE POLICY "Auth users manage contratos" ON public.contratos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. comunicados (comunicadoService.ts)
CREATE TABLE IF NOT EXISTS public.comunicados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo TEXT,
  tipo TEXT DEFAULT 'informativo',
  prioridade INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  data_publicacao TIMESTAMPTZ DEFAULT now(),
  data_expiracao TIMESTAMPTZ,
  empresa_id UUID REFERENCES public.empresas(id),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage comunicados" ON public.comunicados;
CREATE POLICY "Auth users manage comunicados" ON public.comunicados FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. promocoes (promocaoService.ts)
CREATE TABLE IF NOT EXISTS public.promocoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  cargo_anterior_id UUID REFERENCES public.cargos(id),
  cargo_novo_id UUID REFERENCES public.cargos(id),
  salario_anterior NUMERIC,
  salario_novo NUMERIC,
  data_vigencia TEXT NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.promocoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage promocoes" ON public.promocoes;
CREATE POLICY "Auth users manage promocoes" ON public.promocoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. seguros_vida (seguroVidaService.ts)
CREATE TABLE IF NOT EXISTS public.seguros_vida (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  seguradora TEXT,
  numero_apolice TEXT,
  capital_segurado NUMERIC DEFAULT 0,
  premio_mensal NUMERIC DEFAULT 0,
  data_inicio DATE,
  data_fim DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.seguros_vida ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage seguros_vida" ON public.seguros_vida;
CREATE POLICY "Auth users manage seguros_vida" ON public.seguros_vida FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. planos_saude (planoSaudeService.ts)
CREATE TABLE IF NOT EXISTS public.planos_saude (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  operadora TEXT,
  tipo_plano TEXT DEFAULT 'enfermaria',
  numero_carteirinha TEXT,
  valor_mensal NUMERIC DEFAULT 0,
  percentual_empresa NUMERIC DEFAULT 100,
  percentual_colaborador NUMERIC DEFAULT 0,
  data_inicio DATE,
  data_fim DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.planos_saude ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage planos_saude" ON public.planos_saude;
CREATE POLICY "Auth users manage planos_saude" ON public.planos_saude FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 10. pensoes (usePensao.ts)
CREATE TABLE IF NOT EXISTS public.pensoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  beneficiario TEXT NOT NULL,
  cpf_beneficiario TEXT,
  percentual NUMERIC DEFAULT 0,
  valor_fixo NUMERIC DEFAULT 0,
  tipo TEXT DEFAULT 'judicial',
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pensoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage pensoes" ON public.pensoes;
CREATE POLICY "Auth users manage pensoes" ON public.pensoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11. ferias_solicitacoes (useDashboard.ts, dashboardService.ts)
CREATE TABLE IF NOT EXISTS public.ferias_solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  dias INTEGER DEFAULT 30,
  abono_pecuniario BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pendente',
  aprovado_por UUID,
  aprovado_em TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ferias_solicitacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage ferias_solicitacoes" ON public.ferias_solicitacoes;
CREATE POLICY "Auth users manage ferias_solicitacoes" ON public.ferias_solicitacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
