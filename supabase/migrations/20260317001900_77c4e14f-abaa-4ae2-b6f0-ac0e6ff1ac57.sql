
-- Corrigir FK e criar tabelas que falharam na migração anterior

-- 2.3 FALTAS (corrigido: motivo_afastamento_id é integer)
CREATE TABLE IF NOT EXISTS public.faltas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE RESTRICT,
  empresa_id uuid REFERENCES public.empresas(id),
  data date NOT NULL,
  data_fim date,
  dias_total integer DEFAULT 1,
  tipo text NOT NULL DEFAULT 'falta',
  justificada boolean DEFAULT false,
  motivo_afastamento_id integer REFERENCES public.motivos_afastamento(id),
  motivo text,
  status text DEFAULT 'registrada',
  cid text,
  medico_nome text,
  medico_crm text,
  horas_falta interval,
  documento_url text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.faltas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "faltas_select" ON public.faltas;
CREATE POLICY "faltas_select" ON public.faltas FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "faltas_insert" ON public.faltas;
CREATE POLICY "faltas_insert" ON public.faltas FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "faltas_update" ON public.faltas;
CREATE POLICY "faltas_update" ON public.faltas FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "faltas_delete" ON public.faltas;
CREATE POLICY "faltas_delete" ON public.faltas FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- 2.4 MEDIDAS_DISCIPLINARES
CREATE TABLE IF NOT EXISTS public.medidas_disciplinares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE RESTRICT,
  empresa_id uuid REFERENCES public.empresas(id),
  tipo text NOT NULL,
  numero_sequencial integer,
  data_ocorrencia date NOT NULL,
  descricao text NOT NULL,
  testemunha_1 text,
  testemunha_2 text,
  dias_suspensao integer DEFAULT 0,
  status text DEFAULT 'pendente',
  assinado_em timestamptz,
  documento_url text,
  aplicado_por uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.medidas_disciplinares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "medidas_disciplinares_select" ON public.medidas_disciplinares;
CREATE POLICY "medidas_disciplinares_select" ON public.medidas_disciplinares FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "medidas_disciplinares_insert" ON public.medidas_disciplinares;
CREATE POLICY "medidas_disciplinares_insert" ON public.medidas_disciplinares FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "medidas_disciplinares_update" ON public.medidas_disciplinares;
CREATE POLICY "medidas_disciplinares_update" ON public.medidas_disciplinares FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "medidas_disciplinares_delete" ON public.medidas_disciplinares;
CREATE POLICY "medidas_disciplinares_delete" ON public.medidas_disciplinares FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- 2.5 EPIS
CREATE TABLE IF NOT EXISTS public.epis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id),
  nome text NOT NULL,
  descricao text,
  ca text,
  validade_ca date,
  categoria text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.epis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "epis_select" ON public.epis;
CREATE POLICY "epis_select" ON public.epis FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "epis_insert" ON public.epis;
CREATE POLICY "epis_insert" ON public.epis FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "epis_update" ON public.epis;
CREATE POLICY "epis_update" ON public.epis FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "epis_delete" ON public.epis;
CREATE POLICY "epis_delete" ON public.epis FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- 2.6 EPIS_ENTREGAS
CREATE TABLE IF NOT EXISTS public.epis_entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  epi_id uuid NOT NULL REFERENCES public.epis(id) ON DELETE RESTRICT,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE RESTRICT,
  empresa_id uuid REFERENCES public.empresas(id),
  data_entrega date NOT NULL,
  data_devolucao date,
  quantidade integer DEFAULT 1,
  motivo text DEFAULT 'novo',
  assinatura_url text,
  observacoes text,
  entregue_por uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.epis_entregas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "epis_entregas_select" ON public.epis_entregas;
CREATE POLICY "epis_entregas_select" ON public.epis_entregas FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "epis_entregas_insert" ON public.epis_entregas;
CREATE POLICY "epis_entregas_insert" ON public.epis_entregas FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "epis_entregas_update" ON public.epis_entregas;
CREATE POLICY "epis_entregas_update" ON public.epis_entregas FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "epis_entregas_delete" ON public.epis_entregas;
CREATE POLICY "epis_entregas_delete" ON public.epis_entregas FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- 2.7 BANCO_HORAS_CONFIG
CREATE TABLE IF NOT EXISTS public.banco_horas_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id),
  acordo_tipo text DEFAULT 'individual',
  prazo_meses integer DEFAULT 6,
  saldo_maximo_horas integer DEFAULT 40,
  compensacao_automatica boolean DEFAULT false,
  alerta_saldo_negativo_horas integer DEFAULT 8,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.banco_horas_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "banco_horas_config_select" ON public.banco_horas_config;
CREATE POLICY "banco_horas_config_select" ON public.banco_horas_config FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "banco_horas_config_modify" ON public.banco_horas_config;
CREATE POLICY "banco_horas_config_modify" ON public.banco_horas_config FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
