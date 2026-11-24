-- Feriados e jornadas do Ponto AtecSoft (etapa 53 do plano de integracao).
-- Plano: docs/PLANO_INTEGRACAO_PONTO_HENRY_ATECSOFT.md, etapa 53.
--
-- Staging fiel das tabelas FERIADO e HORARIO_LINHAS do AtecSoft. A Edge
-- `ingest-ponto-rep` grava aqui com service_role; o navegador so le, e so
-- admin/RH da propria empresa. O de-para para public.feriados e
-- public.jornadas/jornadas_horarios e etapa separada: depende de decidir a
-- empresa/cidade do feriado e as colunas que faltam em jornadas_horarios.
-- Aditiva e idempotente: nao altera nem remove objeto existente.

CREATE TABLE IF NOT EXISTS public.ponto_rep_feriados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id uuid NOT NULL REFERENCES public.ponto_rep_dispositivos(id) ON DELETE RESTRICT,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  codigo integer NOT NULL,
  nome text,
  data date NOT NULL,
  -- Vem do campo NBH do AtecSoft: feriado que nao consome banco de horas.
  nao_computa_banco_horas boolean NOT NULL DEFAULT false,
  -- Vinculos do AtecSoft. NULL = o feriado vale para todos.
  vinculo_cidade integer,
  vinculo_departamento integer,
  vinculo_empresa integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ponto_rep_feriados_dispositivo_codigo_key UNIQUE (dispositivo_id, codigo)
);
CREATE INDEX IF NOT EXISTS idx_ponto_rep_feriados_empresa_data
  ON public.ponto_rep_feriados (empresa_id, data);

-- Uma linha por jornada e dia da semana: e assim que o AtecSoft guarda
-- (HORARIO_LINHAS). `pares` guarda as horas como [{"entrada","saida"}, ...],
-- com no maximo 6 pares; dia sem jornada (domingo) fica com pares vazio.
CREATE TABLE IF NOT EXISTS public.ponto_rep_horarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispositivo_id uuid NOT NULL REFERENCES public.ponto_rep_dispositivos(id) ON DELETE RESTRICT,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  codigo integer NOT NULL,
  ident integer,
  dia_semana smallint NOT NULL,
  pares jsonb NOT NULL DEFAULT '[]'::jsonb,
  tipo_calculo integer,
  tolerancia_falta time,
  tolerancia_extra time,
  neutro boolean NOT NULL DEFAULT false,
  fecha boolean NOT NULL DEFAULT false,
  ajuste boolean NOT NULL DEFAULT false,
  folga boolean NOT NULL DEFAULT false,
  extra boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ponto_rep_horarios_dispositivo_codigo_dia_key UNIQUE (dispositivo_id, codigo, dia_semana),
  CONSTRAINT ponto_rep_horarios_dia_semana_check CHECK (dia_semana BETWEEN 1 AND 7),
  CONSTRAINT ponto_rep_horarios_pares_array CHECK (jsonb_typeof(pares) = 'array')
);
CREATE INDEX IF NOT EXISTS idx_ponto_rep_horarios_empresa
  ON public.ponto_rep_horarios (empresa_id);

-- Contagem por lote: da visibilidade ao que veio no envio sem abrir as tabelas.
ALTER TABLE public.ponto_rep_lotes ADD COLUMN IF NOT EXISTS total_feriados integer NOT NULL DEFAULT 0;
ALTER TABLE public.ponto_rep_lotes ADD COLUMN IF NOT EXISTS total_horarios integer NOT NULL DEFAULT 0;

ALTER TABLE public.ponto_rep_feriados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ponto_rep_horarios ENABLE ROW LEVEL SECURITY;

-- Leitura: admin/RH da propria empresa. CREATE POLICY guardado por pg_policies
-- (sem DROP POLICY) para a migration ser reaplicavel.
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ponto_rep_feriados' AND policyname = 'ponto_rep_feriados_select_rh'
  ) THEN
    CREATE POLICY ponto_rep_feriados_select_rh ON public.ponto_rep_feriados
      FOR SELECT TO authenticated
      USING (
        public.pertence_a_empresa(empresa_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ponto_rep_horarios' AND policyname = 'ponto_rep_horarios_select_rh'
  ) THEN
    CREATE POLICY ponto_rep_horarios_select_rh ON public.ponto_rep_horarios
      FOR SELECT TO authenticated
      USING (
        public.pertence_a_empresa(empresa_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
      );
  END IF;
END
$migration$;

-- Escrita e exclusiva do backend. authenticated le; anon nao tem nada.
REVOKE ALL ON public.ponto_rep_feriados, public.ponto_rep_horarios FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ponto_rep_feriados, public.ponto_rep_horarios TO authenticated;
GRANT ALL ON public.ponto_rep_feriados, public.ponto_rep_horarios TO service_role;

COMMENT ON TABLE public.ponto_rep_feriados IS 'Feriados do AtecSoft (tabela FERIADO) por coletor.';
COMMENT ON TABLE public.ponto_rep_horarios IS 'Jornadas do AtecSoft (tabela HORARIO_LINHAS), uma linha por dia da semana.';
