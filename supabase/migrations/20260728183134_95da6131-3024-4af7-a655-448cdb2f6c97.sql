-- PCS — Plano de Cargos e Salários
CREATE TABLE IF NOT EXISTS public.pcs_planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  versao integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'em_avaliacao', 'ativo', 'arquivado')),
  vigencia_inicio date,
  vigencia_fim date,
  amplitude_pct numeric(6,2) NOT NULL DEFAULT 40 CHECK (amplitude_pct > 0 AND amplitude_pct <= 200),
  num_steps integer NOT NULL DEFAULT 5 CHECK (num_steps BETWEEN 2 AND 12),
  overlap_pct numeric(6,2) NOT NULL DEFAULT 25 CHECK (overlap_pct >= 0 AND overlap_pct < 100),
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (empresa_id, nome, versao)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pcs_plano_ativo_por_empresa
  ON public.pcs_planos (empresa_id)
  WHERE status = 'ativo' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pcs_planos_empresa ON public.pcs_planos (empresa_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.pcs_fatores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL REFERENCES public.pcs_planos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  peso numeric(6,2) NOT NULL DEFAULT 1 CHECK (peso > 0),
  ordem integer NOT NULL DEFAULT 0,
  graus jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plano_id, nome)
);
CREATE INDEX IF NOT EXISTS idx_pcs_fatores_plano ON public.pcs_fatores (plano_id);

CREATE TABLE IF NOT EXISTS public.pcs_avaliacoes_cargo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL REFERENCES public.pcs_planos(id) ON DELETE CASCADE,
  cargo_id uuid NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  pontuacoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  pontos_total numeric(12,2) NOT NULL DEFAULT 0,
  justificativa text,
  avaliado_por uuid,
  avaliado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plano_id, cargo_id)
);
CREATE INDEX IF NOT EXISTS idx_pcs_aval_plano ON public.pcs_avaliacoes_cargo (plano_id);
CREATE INDEX IF NOT EXISTS idx_pcs_aval_cargo ON public.pcs_avaliacoes_cargo (cargo_id);

CREATE OR REPLACE FUNCTION public.pcs_recalc_pontos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $fn$
DECLARE
  v_total numeric(12,2) := 0;
BEGIN
  SELECT COALESCE(SUM(f.peso * COALESCE((NEW.pontuacoes ->> f.id::text)::numeric, 0)), 0)
    INTO v_total
    FROM public.pcs_fatores f
   WHERE f.plano_id = NEW.plano_id;
  NEW.pontos_total := v_total;
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_pcs_recalc_pontos ON public.pcs_avaliacoes_cargo;
CREATE TRIGGER trg_pcs_recalc_pontos
  BEFORE INSERT OR UPDATE OF pontuacoes ON public.pcs_avaliacoes_cargo
  FOR EACH ROW EXECUTE FUNCTION public.pcs_recalc_pontos();

CREATE TABLE IF NOT EXISTS public.pcs_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL REFERENCES public.pcs_planos(id) ON DELETE CASCADE,
  ordem integer NOT NULL,
  nome text NOT NULL,
  pontos_min numeric(12,2) NOT NULL,
  pontos_max numeric(12,2) NOT NULL,
  salario_min numeric(14,2) NOT NULL CHECK (salario_min >= 0),
  salario_medio numeric(14,2) NOT NULL CHECK (salario_medio >= 0),
  salario_max numeric(14,2) NOT NULL CHECK (salario_max >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plano_id, ordem),
  CONSTRAINT pcs_grades_pontos_coerentes CHECK (pontos_max > pontos_min),
  CONSTRAINT pcs_grades_salarios_coerentes CHECK (salario_max >= salario_medio AND salario_medio >= salario_min)
);
CREATE INDEX IF NOT EXISTS idx_pcs_grades_plano ON public.pcs_grades (plano_id, ordem);

CREATE TABLE IF NOT EXISTS public.pcs_pesquisa_salarial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cargo_id uuid REFERENCES public.cargos(id) ON DELETE CASCADE,
  cargo_referencia text NOT NULL,
  fonte text NOT NULL,
  data_referencia date NOT NULL,
  regiao text,
  amostra integer CHECK (amostra IS NULL OR amostra > 0),
  p25 numeric(14,2) CHECK (p25 IS NULL OR p25 >= 0),
  p50 numeric(14,2) CHECK (p50 IS NULL OR p50 >= 0),
  p75 numeric(14,2) CHECK (p75 IS NULL OR p75 >= 0),
  p90 numeric(14,2) CHECK (p90 IS NULL OR p90 >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pcs_pesquisa_empresa ON public.pcs_pesquisa_salarial (empresa_id, data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_pcs_pesquisa_cargo ON public.pcs_pesquisa_salarial (cargo_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pcs_planos            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pcs_fatores           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pcs_avaliacoes_cargo  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pcs_grades            TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pcs_pesquisa_salarial TO authenticated;
GRANT ALL ON public.pcs_planos            TO service_role;
GRANT ALL ON public.pcs_fatores           TO service_role;
GRANT ALL ON public.pcs_avaliacoes_cargo  TO service_role;
GRANT ALL ON public.pcs_grades            TO service_role;
GRANT ALL ON public.pcs_pesquisa_salarial TO service_role;

ALTER TABLE public.pcs_planos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcs_fatores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcs_avaliacoes_cargo  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcs_grades            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcs_pesquisa_salarial ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.pcs_pode_gerir_plano(_plano_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.pcs_planos p
     WHERE p.id = _plano_id
       AND public.user_belongs_to_empresa(auth.uid(), p.empresa_id)
       AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
  );
$fn$;

CREATE OR REPLACE FUNCTION public.pcs_pode_ver_plano(_plano_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.pcs_planos p
     WHERE p.id = _plano_id
       AND public.user_belongs_to_empresa(auth.uid(), p.empresa_id)
  );
$fn$;

REVOKE ALL ON FUNCTION public.pcs_pode_gerir_plano(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pcs_pode_ver_plano(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pcs_pode_gerir_plano(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.pcs_pode_ver_plano(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.pcs_pode_gerir_plano(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pcs_pode_ver_plano(uuid) TO authenticated;

DROP POLICY IF EXISTS pcs_planos_select ON public.pcs_planos;
CREATE POLICY pcs_planos_select ON public.pcs_planos
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

DROP POLICY IF EXISTS pcs_planos_insert ON public.pcs_planos;
CREATE POLICY pcs_planos_insert ON public.pcs_planos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_belongs_to_empresa(auth.uid(), empresa_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
  );

DROP POLICY IF EXISTS pcs_planos_update ON public.pcs_planos;
CREATE POLICY pcs_planos_update ON public.pcs_planos
  FOR UPDATE TO authenticated
  USING (
    public.user_belongs_to_empresa(auth.uid(), empresa_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
  )
  WITH CHECK (public.user_belongs_to_empresa(auth.uid(), empresa_id));

DROP POLICY IF EXISTS pcs_planos_delete ON public.pcs_planos;
CREATE POLICY pcs_planos_delete ON public.pcs_planos
  FOR DELETE TO authenticated
  USING (
    public.user_belongs_to_empresa(auth.uid(), empresa_id)
    AND public.has_role(auth.uid(), 'admin')
  );

DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pcs_fatores', 'pcs_avaliacoes_cargo', 'pcs_grades'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING (public.pcs_pode_ver_plano(plano_id))', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_write ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_write ON public.%I FOR ALL TO authenticated USING (public.pcs_pode_gerir_plano(plano_id)) WITH CHECK (public.pcs_pode_gerir_plano(plano_id))', t, t);
  END LOOP;
END;
$do$;

DROP POLICY IF EXISTS pcs_pesquisa_select ON public.pcs_pesquisa_salarial;
CREATE POLICY pcs_pesquisa_select ON public.pcs_pesquisa_salarial
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

DROP POLICY IF EXISTS pcs_pesquisa_write ON public.pcs_pesquisa_salarial;
CREATE POLICY pcs_pesquisa_write ON public.pcs_pesquisa_salarial
  FOR ALL TO authenticated
  USING (
    public.user_belongs_to_empresa(auth.uid(), empresa_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
  )
  WITH CHECK (
    public.user_belongs_to_empresa(auth.uid(), empresa_id)
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
  );

CREATE OR REPLACE FUNCTION public.pcs_gerar_grades(
  p_plano_id uuid,
  p_num_grades integer DEFAULT 8,
  p_salario_base_menor numeric DEFAULT NULL
)
RETURNS SETOF public.pcs_grades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_min numeric;
  v_max numeric;
  v_step numeric;
  v_plano public.pcs_planos%ROWTYPE;
  v_base numeric;
  v_prog numeric;
  i integer;
  v_medio numeric;
BEGIN
  IF NOT public.pcs_pode_gerir_plano(p_plano_id) THEN
    RAISE EXCEPTION 'Sem permissão para gerir este plano' USING ERRCODE = '42501';
  END IF;
  IF p_num_grades IS NULL OR p_num_grades < 2 OR p_num_grades > 30 THEN
    RAISE EXCEPTION 'Número de grades deve estar entre 2 e 30' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_plano FROM public.pcs_planos WHERE id = p_plano_id;

  SELECT MIN(pontos_total), MAX(pontos_total) INTO v_min, v_max
    FROM public.pcs_avaliacoes_cargo WHERE plano_id = p_plano_id;

  IF v_min IS NULL OR v_max IS NULL OR v_max <= v_min THEN
    RAISE EXCEPTION 'É preciso avaliar ao menos dois cargos com pontuações distintas antes de gerar as grades' USING ERRCODE = '22023';
  END IF;

  v_base := p_salario_base_menor;
  IF v_base IS NULL THEN
    SELECT MIN(NULLIF(c.salario_base, 0)) INTO v_base
      FROM public.pcs_avaliacoes_cargo a
      JOIN public.cargos c ON c.id = a.cargo_id
     WHERE a.plano_id = p_plano_id;
  END IF;
  IF v_base IS NULL OR v_base <= 0 THEN
    RAISE EXCEPTION 'Informe o salário-base da primeira grade (nenhum cargo avaliado possui salário cadastrado)' USING ERRCODE = '22023';
  END IF;

  v_step := (v_max - v_min) / p_num_grades;
  v_prog := 1 + ((100 - v_plano.overlap_pct) / 100.0) * (v_plano.amplitude_pct / 100.0);

  DELETE FROM public.pcs_grades WHERE plano_id = p_plano_id;

  FOR i IN 1..p_num_grades LOOP
    v_medio := ROUND(v_base * POWER(v_prog, i - 1), 2);
    INSERT INTO public.pcs_grades (
      plano_id, ordem, nome, pontos_min, pontos_max, salario_min, salario_medio, salario_max
    ) VALUES (
      p_plano_id, i, 'Grade ' || i,
      ROUND(v_min + v_step * (i - 1), 2),
      ROUND(CASE WHEN i = p_num_grades THEN v_max ELSE v_min + v_step * i END, 2),
      ROUND(v_medio / (1 + v_plano.amplitude_pct / 200.0), 2),
      v_medio,
      ROUND(v_medio * (1 + v_plano.amplitude_pct / 200.0), 2)
    );
  END LOOP;

  RETURN QUERY SELECT * FROM public.pcs_grades WHERE plano_id = p_plano_id ORDER BY ordem;
END;
$fn$;

REVOKE ALL ON FUNCTION public.pcs_gerar_grades(uuid, integer, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pcs_gerar_grades(uuid, integer, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.pcs_gerar_grades(uuid, integer, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.pcs_enquadramento(p_plano_id uuid)
RETURNS TABLE (
  colaborador_id uuid,
  colaborador_nome text,
  cargo_nome text,
  departamento text,
  salario_atual numeric,
  grade_nome text,
  grade_ordem integer,
  salario_min numeric,
  salario_medio numeric,
  salario_max numeric,
  comparatio numeric,
  situacao text,
  ajuste_necessario numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  WITH plano AS (
    SELECT p.* FROM public.pcs_planos p
     WHERE p.id = p_plano_id
       AND public.user_belongs_to_empresa(auth.uid(), p.empresa_id)
  ),
  cargo_grade AS (
    SELECT a.cargo_id, c.nome AS cargo_nome, g.*
      FROM public.pcs_avaliacoes_cargo a
      JOIN public.cargos c ON c.id = a.cargo_id
      JOIN public.pcs_grades g
        ON g.plano_id = a.plano_id
       AND a.pontos_total >= g.pontos_min
       AND a.pontos_total <= g.pontos_max
     WHERE a.plano_id = p_plano_id
  )
  SELECT
    col.id,
    col.nome_completo,
    cg.cargo_nome,
    col.departamento,
    col.salario_base,
    cg.nome,
    cg.ordem,
    cg.salario_min,
    cg.salario_medio,
    cg.salario_max,
    ROUND(col.salario_base / NULLIF(cg.salario_medio, 0), 4),
    CASE
      WHEN col.salario_base < cg.salario_min THEN 'abaixo_faixa'
      WHEN col.salario_base > cg.salario_max THEN 'acima_faixa'
      ELSE 'dentro_faixa'
    END,
    CASE
      WHEN col.salario_base < cg.salario_min THEN ROUND(cg.salario_min - col.salario_base, 2)
      ELSE 0
    END
  FROM plano pl
  JOIN public.colaboradores col
    ON col.empresa_id = pl.empresa_id
   AND col.status = 'ativo'
   AND col.salario_base IS NOT NULL
  JOIN cargo_grade cg
    ON lower(btrim(col.cargo)) = lower(btrim(cg.cargo_nome))
  ORDER BY cg.ordem DESC, col.nome_completo;
$fn$;

REVOKE ALL ON FUNCTION public.pcs_enquadramento(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pcs_enquadramento(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.pcs_enquadramento(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.pcs_simular_impacto(
  p_plano_id uuid,
  p_encargos_pct numeric DEFAULT 36.8
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v jsonb;
BEGIN
  IF NOT public.pcs_pode_ver_plano(p_plano_id) THEN
    RAISE EXCEPTION 'Sem permissão para consultar este plano' USING ERRCODE = '42501';
  END IF;
  IF p_encargos_pct IS NULL OR p_encargos_pct < 0 OR p_encargos_pct > 200 THEN
    RAISE EXCEPTION 'Percentual de encargos inválido' USING ERRCODE = '22023';
  END IF;

  SELECT jsonb_build_object(
    'colaboradores_enquadrados', COUNT(*),
    'abaixo_faixa',   COUNT(*) FILTER (WHERE situacao = 'abaixo_faixa'),
    'dentro_faixa',   COUNT(*) FILTER (WHERE situacao = 'dentro_faixa'),
    'acima_faixa',    COUNT(*) FILTER (WHERE situacao = 'acima_faixa'),
    'folha_atual',    ROUND(COALESCE(SUM(salario_atual), 0), 2),
    'ajuste_mensal',  ROUND(COALESCE(SUM(ajuste_necessario), 0), 2),
    'ajuste_com_encargos', ROUND(COALESCE(SUM(ajuste_necessario), 0) * (1 + p_encargos_pct / 100.0), 2),
    'impacto_anual',  ROUND(COALESCE(SUM(ajuste_necessario), 0) * (1 + p_encargos_pct / 100.0) * 13.33, 2),
    'impacto_pct_folha', ROUND(COALESCE(SUM(ajuste_necessario), 0) / NULLIF(SUM(salario_atual), 0) * 100, 2),
    'comparatio_medio', ROUND(AVG(comparatio), 4),
    'encargos_pct', p_encargos_pct
  ) INTO v
    FROM public.pcs_enquadramento(p_plano_id);

  RETURN COALESCE(v, '{}'::jsonb);
END;
$fn$;

REVOKE ALL ON FUNCTION public.pcs_simular_impacto(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pcs_simular_impacto(uuid, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.pcs_simular_impacto(uuid, numeric) TO authenticated;

COMMENT ON TABLE public.pcs_planos IS 'PCS: versões do Plano de Cargos e Salários por empresa. Apenas um ativo por empresa.';
COMMENT ON TABLE public.pcs_fatores IS 'PCS: fatores de avaliação de cargos (peso + graus) — metodologia por pontos.';
COMMENT ON TABLE public.pcs_avaliacoes_cargo IS 'PCS: pontuação de cada cargo por fator; pontos_total é calculado por trigger.';
COMMENT ON TABLE public.pcs_grades IS 'PCS: grades/classes salariais com faixa mínima, média e máxima.';
COMMENT ON TABLE public.pcs_pesquisa_salarial IS 'PCS: benchmark de mercado por cargo (percentis P25/P50/P75/P90).';