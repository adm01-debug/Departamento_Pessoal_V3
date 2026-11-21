-- Entrada do relógio de ponto (Henry + Ponto AtecSoft) — staging da integração.
-- Plano: docs/PLANO_INTEGRACAO_PONTO_HENRY_ATECSOFT.md, etapas 19–23 e 26–28.
--
-- Um coletor por unidade lê o banco do AtecSoft e envia para a Edge Function
-- `ingest-ponto-rep`, que grava aqui com service_role. Nenhuma destas tabelas é
-- escrita pelo navegador: authenticated só lê, e só admin/RH da própria empresa.
-- Aditiva e idempotente: não altera nem remove objeto existente.

CREATE TABLE IF NOT EXISTS public.ponto_rep_dispositivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  unidade text NOT NULL,
  -- SHA-256 (hex) do token do coletor. O token em claro nunca é gravado.
  token_hash text NOT NULL,
  token_prefixo text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  revogado_em timestamptz,
  ultimo_contato_em timestamptz,
  ultima_marcacao_em timestamptz,
  versao_coletor text,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ponto_rep_dispositivos_token_hash_key UNIQUE (token_hash),
  CONSTRAINT ponto_rep_dispositivos_empresa_unidade_key UNIQUE (empresa_id, unidade),
  CONSTRAINT ponto_rep_dispositivos_token_hash_fmt CHECK (token_hash ~ '^[0-9a-f]{64}$')
);

CREATE TABLE IF NOT EXISTS public.ponto_rep_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id uuid NOT NULL REFERENCES public.ponto_rep_dispositivos(id) ON DELETE RESTRICT,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  recebido_em timestamptz NOT NULL DEFAULT now(),
  periodo_inicio date,
  periodo_fim date,
  total_funcionarios integer NOT NULL DEFAULT 0,
  total_dias integer NOT NULL DEFAULT 0,
  dias_alterados integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'recebido',
  mensagem_erro text,
  hash_sha256 text,
  CONSTRAINT ponto_rep_lotes_status_check CHECK (status IN ('recebido', 'processado', 'parcial', 'erro'))
);
CREATE INDEX IF NOT EXISTS idx_ponto_rep_lotes_dispositivo_recebido
  ON public.ponto_rep_lotes (dispositivo_id, recebido_em DESC);

-- Cópia do cadastro FUNCIONARIO do AtecSoft + vínculo com o colaborador do DP.
CREATE TABLE IF NOT EXISTS public.ponto_rep_funcionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id uuid NOT NULL REFERENCES public.ponto_rep_dispositivos(id) ON DELETE RESTRICT,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  codigo integer NOT NULL,
  nome text,
  matricula text,
  cpf text,
  pis text,
  situacao text,
  empresa_codigo integer,
  horario_codigo integer,
  data_admissao date,
  data_desligamento date,
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE SET NULL,
  vinculo_metodo text,
  vinculado_em timestamptz,
  hash_conteudo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ponto_rep_funcionarios_dispositivo_codigo_key UNIQUE (dispositivo_id, codigo),
  CONSTRAINT ponto_rep_funcionarios_vinculo_metodo_check
    CHECK (vinculo_metodo IS NULL OR vinculo_metodo IN ('cpf', 'pis', 'matricula', 'manual'))
);
CREATE INDEX IF NOT EXISTS idx_ponto_rep_funcionarios_colaborador
  ON public.ponto_rep_funcionarios (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_ponto_rep_funcionarios_empresa
  ON public.ponto_rep_funcionarios (empresa_id);

-- Cópia fiel de cada linha da tabela CP do AtecSoft (um funcionário, um dia).
-- `marcacoes` guarda as até 12 posições (E1..E6, S1..S6) com hora, data real,
-- referência, observação, justificativa e relógio de origem.
CREATE TABLE IF NOT EXISTS public.ponto_rep_dias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id uuid NOT NULL REFERENCES public.ponto_rep_dispositivos(id) ON DELETE RESTRICT,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  lote_id uuid REFERENCES public.ponto_rep_lotes(id) ON DELETE SET NULL,
  funcionario_codigo integer NOT NULL,
  data date NOT NULL,
  marcacoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  abono time,
  abono_negativo time,
  folga boolean NOT NULL DEFAULT false,
  neutro boolean NOT NULL DEFAULT false,
  justificativa_abono integer,
  horario_codigo integer,
  hash_conteudo text NOT NULL,
  processado_em timestamptz,
  erro_processamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ponto_rep_dias_dispositivo_func_data_key UNIQUE (dispositivo_id, funcionario_codigo, data),
  CONSTRAINT ponto_rep_dias_marcacoes_array CHECK (jsonb_typeof(marcacoes) = 'array')
);
CREATE INDEX IF NOT EXISTS idx_ponto_rep_dias_empresa_data
  ON public.ponto_rep_dias (empresa_id, data);
CREATE INDEX IF NOT EXISTS idx_ponto_rep_dias_pendentes
  ON public.ponto_rep_dias (dispositivo_id, data) WHERE processado_em IS NULL;

-- De-para das justificativas do AtecSoft para o tipo de dia do DP.
-- Os valores de tipo_dia são os de registros_ponto_tipo_dia_check.
CREATE TABLE IF NOT EXISTS public.ponto_rep_justificativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id uuid NOT NULL REFERENCES public.ponto_rep_dispositivos(id) ON DELETE RESTRICT,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  codigo integer NOT NULL,
  nome text NOT NULL,
  considera_normal boolean NOT NULL DEFAULT false,
  considera_falta boolean NOT NULL DEFAULT false,
  tipo_dia text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ponto_rep_justificativas_dispositivo_codigo_key UNIQUE (dispositivo_id, codigo),
  CONSTRAINT ponto_rep_justificativas_tipo_dia_check CHECK (
    tipo_dia IS NULL OR tipo_dia IN
      ('normal', 'feriado', 'compensado', 'folga', 'falta', 'atestado', 'ferias', 'licenca')
  )
);
CREATE INDEX IF NOT EXISTS idx_ponto_rep_justificativas_empresa
  ON public.ponto_rep_justificativas (empresa_id);

ALTER TABLE public.ponto_rep_dispositivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ponto_rep_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ponto_rep_funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ponto_rep_dias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ponto_rep_justificativas ENABLE ROW LEVEL SECURITY;

-- Leitura: admin/RH da própria empresa. CREATE POLICY guardado por pg_policies
-- (sem DROP POLICY) para a migration ser reaplicável.
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ponto_rep_dispositivos' AND policyname = 'ponto_rep_dispositivos_select_rh'
  ) THEN
    CREATE POLICY ponto_rep_dispositivos_select_rh ON public.ponto_rep_dispositivos
      FOR SELECT TO authenticated
      USING (
        public.pertence_a_empresa(empresa_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ponto_rep_lotes' AND policyname = 'ponto_rep_lotes_select_rh'
  ) THEN
    CREATE POLICY ponto_rep_lotes_select_rh ON public.ponto_rep_lotes
      FOR SELECT TO authenticated
      USING (
        public.pertence_a_empresa(empresa_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ponto_rep_funcionarios' AND policyname = 'ponto_rep_funcionarios_select_rh'
  ) THEN
    CREATE POLICY ponto_rep_funcionarios_select_rh ON public.ponto_rep_funcionarios
      FOR SELECT TO authenticated
      USING (
        public.pertence_a_empresa(empresa_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ponto_rep_dias' AND policyname = 'ponto_rep_dias_select_rh'
  ) THEN
    CREATE POLICY ponto_rep_dias_select_rh ON public.ponto_rep_dias
      FOR SELECT TO authenticated
      USING (
        public.pertence_a_empresa(empresa_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ponto_rep_justificativas' AND policyname = 'ponto_rep_justificativas_select_rh'
  ) THEN
    CREATE POLICY ponto_rep_justificativas_select_rh ON public.ponto_rep_justificativas
      FOR SELECT TO authenticated
      USING (
        public.pertence_a_empresa(empresa_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
      );
  END IF;
END
$migration$;

-- Escrita é exclusiva do backend. authenticated lê; anon não tem nada.
REVOKE ALL ON public.ponto_rep_dispositivos, public.ponto_rep_lotes, public.ponto_rep_funcionarios,
  public.ponto_rep_dias, public.ponto_rep_justificativas FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ponto_rep_lotes, public.ponto_rep_funcionarios,
  public.ponto_rep_dias, public.ponto_rep_justificativas TO authenticated;
-- Em dispositivos, token_hash fica fora do alcance do navegador: GRANT por coluna.
GRANT SELECT (id, empresa_id, nome, unidade, token_prefixo, ativo, revogado_em, ultimo_contato_em,
  ultima_marcacao_em, versao_coletor, created_at, updated_at)
  ON public.ponto_rep_dispositivos TO authenticated;
GRANT ALL ON public.ponto_rep_dispositivos, public.ponto_rep_lotes, public.ponto_rep_funcionarios,
  public.ponto_rep_dias, public.ponto_rep_justificativas TO service_role;

COMMENT ON TABLE public.ponto_rep_dispositivos IS 'Coletores do relógio de ponto, um por unidade. Token só em hash.';
COMMENT ON TABLE public.ponto_rep_lotes IS 'Cada envio recebido de um coletor do relógio de ponto.';
COMMENT ON TABLE public.ponto_rep_funcionarios IS 'Cadastro de funcionários vindo do AtecSoft e vínculo com colaboradores.';
COMMENT ON TABLE public.ponto_rep_dias IS 'Cópia fiel do cartão ponto diário do AtecSoft (tabela CP).';
COMMENT ON TABLE public.ponto_rep_justificativas IS 'De-para das justificativas do AtecSoft para o tipo de dia do DP.';
