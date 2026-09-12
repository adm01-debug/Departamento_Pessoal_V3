-- P1: deliver the PCS (Plano de Cargos e Salarios) database contract that is
-- already consumed by the application. The two historical PCS migrations were
-- never applied to the canonical project and are intentionally not replayed:
-- this migration is the reviewed, idempotent consolidation.

DO $preflight$
DECLARE
  required_table text;
  pcs_table_count integer;
BEGIN
  FOREACH required_table IN ARRAY ARRAY['empresas', 'cargos', 'colaboradores'] LOOP
    IF to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION 'P1 PCS contract requires public.%', required_table;
    END IF;
  END LOOP;

  IF to_regprocedure('public.get_user_empresas(uuid)') IS NULL
     OR to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL
     OR to_regprocedure('public.is_admin(uuid)') IS NULL
     OR to_regprocedure('public.pode_gerir_rh(uuid)') IS NULL THEN
    RAISE EXCEPTION 'P1 PCS contract requires persisted membership and RBAC helpers';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.empresas'::regclass AND attname = 'id'
      AND atttypid = 'uuid'::regtype AND NOT attisdropped
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.cargos'::regclass AND attname = 'id'
      AND atttypid = 'uuid'::regtype AND NOT attisdropped
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.colaboradores'::regclass AND attname = 'id'
      AND atttypid = 'uuid'::regtype AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION 'P1 PCS contract requires UUID primary identities';
  END IF;

  SELECT count(*) INTO pcs_table_count
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    AND c.relname = ANY (ARRAY[
      'pcs_planos', 'pcs_fatores', 'pcs_avaliacoes_cargo',
      'pcs_grades', 'pcs_pesquisa_salarial'
    ]);

  IF pcs_table_count NOT IN (0, 5) THEN
    RAISE EXCEPTION 'P1 PCS contract refuses a partial PCS schema (%/5 tables)', pcs_table_count;
  END IF;
END
$preflight$;

CREATE TABLE IF NOT EXISTS public.pcs_planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL CHECK (length(btrim(nome)) BETWEEN 1 AND 160),
  versao integer NOT NULL DEFAULT 1 CHECK (versao > 0),
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'em_avaliacao', 'ativo', 'arquivado')),
  vigencia_inicio date,
  vigencia_fim date,
  amplitude_pct numeric(6,2) NOT NULL DEFAULT 40
    CHECK (amplitude_pct > 0 AND amplitude_pct <= 200),
  num_steps integer NOT NULL DEFAULT 5 CHECK (num_steps BETWEEN 2 AND 12),
  overlap_pct numeric(6,2) NOT NULL DEFAULT 25
    CHECK (overlap_pct >= 0 AND overlap_pct < 100),
  observacoes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT pcs_planos_vigencia_coerente
    CHECK (vigencia_fim IS NULL OR vigencia_inicio IS NULL OR vigencia_fim >= vigencia_inicio),
  UNIQUE (empresa_id, nome, versao)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pcs_plano_ativo_por_empresa
  ON public.pcs_planos (empresa_id)
  WHERE status = 'ativo' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pcs_planos_empresa
  ON public.pcs_planos (empresa_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.pcs_fatores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL REFERENCES public.pcs_planos(id) ON DELETE CASCADE,
  nome text NOT NULL CHECK (length(btrim(nome)) BETWEEN 1 AND 160),
  descricao text,
  peso numeric(8,4) NOT NULL DEFAULT 1 CHECK (peso > 0 AND peso <= 1000),
  ordem integer NOT NULL DEFAULT 0 CHECK (ordem >= 0),
  graus jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plano_id, nome),
  UNIQUE (plano_id, ordem)
);
CREATE INDEX IF NOT EXISTS idx_pcs_fatores_plano ON public.pcs_fatores (plano_id, ordem);

CREATE TABLE IF NOT EXISTS public.pcs_avaliacoes_cargo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL REFERENCES public.pcs_planos(id) ON DELETE CASCADE,
  cargo_id uuid NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  pontuacoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  pontos_total numeric(14,4) NOT NULL DEFAULT 0 CHECK (pontos_total >= 0),
  justificativa text,
  avaliado_por uuid NOT NULL DEFAULT auth.uid(),
  avaliado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plano_id, cargo_id)
);
CREATE INDEX IF NOT EXISTS idx_pcs_aval_plano
  ON public.pcs_avaliacoes_cargo (plano_id, pontos_total DESC);
CREATE INDEX IF NOT EXISTS idx_pcs_aval_cargo ON public.pcs_avaliacoes_cargo (cargo_id);

CREATE TABLE IF NOT EXISTS public.pcs_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL REFERENCES public.pcs_planos(id) ON DELETE CASCADE,
  ordem integer NOT NULL CHECK (ordem > 0),
  nome text NOT NULL CHECK (length(btrim(nome)) BETWEEN 1 AND 160),
  pontos_min numeric(14,4) NOT NULL,
  pontos_max numeric(14,4) NOT NULL,
  salario_min numeric(14,2) NOT NULL CHECK (salario_min >= 0),
  salario_medio numeric(14,2) NOT NULL CHECK (salario_medio >= 0),
  salario_max numeric(14,2) NOT NULL CHECK (salario_max >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plano_id, ordem),
  CONSTRAINT pcs_grades_pontos_coerentes CHECK (pontos_max > pontos_min),
  CONSTRAINT pcs_grades_salarios_coerentes
    CHECK (salario_max >= salario_medio AND salario_medio >= salario_min)
);
CREATE INDEX IF NOT EXISTS idx_pcs_grades_plano
  ON public.pcs_grades (plano_id, ordem);

CREATE TABLE IF NOT EXISTS public.pcs_pesquisa_salarial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cargo_id uuid REFERENCES public.cargos(id) ON DELETE SET NULL,
  cargo_referencia text NOT NULL CHECK (length(btrim(cargo_referencia)) BETWEEN 1 AND 160),
  fonte text NOT NULL CHECK (length(btrim(fonte)) BETWEEN 1 AND 240),
  data_referencia date NOT NULL,
  regiao text,
  amostra integer CHECK (amostra IS NULL OR amostra > 0),
  p25 numeric(14,2) CHECK (p25 IS NULL OR p25 >= 0),
  p50 numeric(14,2) CHECK (p50 IS NULL OR p50 >= 0),
  p75 numeric(14,2) CHECK (p75 IS NULL OR p75 >= 0),
  p90 numeric(14,2) CHECK (p90 IS NULL OR p90 >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pcs_pesquisa_percentis_coerentes CHECK (
    (p25 IS NULL OR p50 IS NULL OR p25 <= p50)
    AND (p50 IS NULL OR p75 IS NULL OR p50 <= p75)
    AND (p75 IS NULL OR p90 IS NULL OR p75 <= p90)
  )
);
CREATE INDEX IF NOT EXISTS idx_pcs_pesquisa_empresa
  ON public.pcs_pesquisa_salarial (empresa_id, data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_pcs_pesquisa_cargo
  ON public.pcs_pesquisa_salarial (cargo_id) WHERE cargo_id IS NOT NULL;

ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS cargo_id uuid;
DO $cargo_fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.colaboradores'::regclass
      AND contype = 'f' AND conkey = ARRAY[
        (SELECT attnum FROM pg_catalog.pg_attribute
         WHERE attrelid = 'public.colaboradores'::regclass AND attname = 'cargo_id')
      ]::smallint[]
  ) THEN
    ALTER TABLE public.colaboradores
      ADD CONSTRAINT colaboradores_cargo_id_fkey
      FOREIGN KEY (cargo_id) REFERENCES public.cargos(id) ON DELETE SET NULL;
  END IF;
END
$cargo_fk$;
CREATE INDEX IF NOT EXISTS idx_colaboradores_cargo_id
  ON public.colaboradores (cargo_id) WHERE cargo_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.pcs_pode_ver_plano(_plano_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.pcs_planos p
    WHERE p.id = _plano_id
      AND p.deleted_at IS NULL
      AND (
        public.is_admin(auth.uid())
        OR p.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
      )
  )
$function$;

CREATE OR REPLACE FUNCTION public.pcs_pode_gerir_plano(_plano_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.pcs_planos p
    WHERE p.id = _plano_id
      AND p.deleted_at IS NULL
      AND public.pode_gerir_rh(p.empresa_id)
  )
$function$;

REVOKE ALL ON FUNCTION public.pcs_pode_ver_plano(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pcs_pode_gerir_plano(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pcs_pode_ver_plano(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pcs_pode_gerir_plano(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.pcs_validate_factor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
  IF jsonb_typeof(NEW.graus) <> 'array' OR jsonb_array_length(NEW.graus) = 0 THEN
    RAISE EXCEPTION 'graus must be a non-empty JSON array' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(NEW.graus) AS item
    WHERE jsonb_typeof(item) <> 'object'
      OR jsonb_typeof(item->'grau') <> 'number'
      OR jsonb_typeof(item->'pontos') <> 'number'
      OR (item->>'pontos')::numeric < 0
      OR length(btrim(COALESCE(item->>'rotulo', ''))) = 0
  ) THEN
    RAISE EXCEPTION 'each PCS grade must contain numeric grau/pontos and a rotulo' USING ERRCODE = '22023';
  END IF;
  IF (
    SELECT count(*) FROM jsonb_array_elements(NEW.graus)
  ) <> (
    SELECT count(DISTINCT item->>'grau') FROM jsonb_array_elements(NEW.graus) AS item
  ) THEN
    RAISE EXCEPTION 'PCS factor grade identifiers must be unique' USING ERRCODE = '22023';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.pcs_recalc_pontos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  expected integer;
  supplied integer;
  total numeric(14,4);
BEGIN
  IF jsonb_typeof(NEW.pontuacoes) <> 'object' THEN
    RAISE EXCEPTION 'pontuacoes must be a JSON object' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pcs_planos p
    JOIN public.cargos c ON c.id = NEW.cargo_id
    WHERE p.id = NEW.plano_id
      AND (c.empresa_id = p.empresa_id OR c.empresa_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'cargo does not belong to the PCS tenant' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO expected
  FROM public.pcs_fatores f WHERE f.plano_id = NEW.plano_id;
  SELECT count(*) INTO supplied FROM jsonb_each(NEW.pontuacoes);
  IF expected = 0 OR supplied <> expected THEN
    RAISE EXCEPTION 'pontuacoes must contain exactly one value per PCS factor' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_each(NEW.pontuacoes) p(key, value)
    LEFT JOIN public.pcs_fatores f
      ON f.plano_id = NEW.plano_id AND f.id::text = p.key
    WHERE f.id IS NULL OR jsonb_typeof(p.value) <> 'number'
      OR NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(f.graus) AS grade
        WHERE (grade->>'pontos')::numeric = (p.value #>> '{}')::numeric
      )
  ) THEN
    RAISE EXCEPTION 'pontuacoes contains an unknown factor or value' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(sum(f.peso * (NEW.pontuacoes->>f.id::text)::numeric), 0)
  INTO total FROM public.pcs_fatores f WHERE f.plano_id = NEW.plano_id;
  NEW.pontos_total := total;
  NEW.avaliado_por := COALESCE(auth.uid(), NEW.avaliado_por);
  IF NEW.avaliado_por IS NULL THEN
    RAISE EXCEPTION 'avaliado_por is required' USING ERRCODE = '23502';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.pcs_set_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(auth.uid(), NEW.created_by);
    IF NEW.created_by IS NULL THEN
      RAISE EXCEPTION 'created_by is required' USING ERRCODE = '23502';
    END IF;
  ELSIF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by is immutable' USING ERRCODE = '42501';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END
$function$;

CREATE OR REPLACE FUNCTION public.pcs_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS trg_pcs_planos_audit ON public.pcs_planos;
CREATE TRIGGER trg_pcs_planos_audit BEFORE INSERT OR UPDATE ON public.pcs_planos
FOR EACH ROW EXECUTE FUNCTION public.pcs_set_audit_fields();
DROP TRIGGER IF EXISTS trg_pcs_validate_factor ON public.pcs_fatores;
CREATE TRIGGER trg_pcs_validate_factor BEFORE INSERT OR UPDATE ON public.pcs_fatores
FOR EACH ROW EXECUTE FUNCTION public.pcs_validate_factor();
DROP TRIGGER IF EXISTS trg_pcs_recalc_pontos ON public.pcs_avaliacoes_cargo;
CREATE TRIGGER trg_pcs_recalc_pontos BEFORE INSERT OR UPDATE ON public.pcs_avaliacoes_cargo
FOR EACH ROW EXECUTE FUNCTION public.pcs_recalc_pontos();

DO $touch_triggers$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['pcs_grades', 'pcs_pesquisa_salarial'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_' || table_name || '_updated_at', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.pcs_touch_updated_at()',
      'trg_' || table_name || '_updated_at', table_name
    );
  END LOOP;
END
$touch_triggers$;

REVOKE ALL ON FUNCTION public.pcs_validate_factor() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pcs_recalc_pontos() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pcs_set_audit_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pcs_touch_updated_at() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.pcs_planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcs_fatores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcs_avaliacoes_cargo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcs_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcs_pesquisa_salarial ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.pcs_planos, public.pcs_fatores,
  public.pcs_avaliacoes_cargo, public.pcs_grades,
  public.pcs_pesquisa_salarial FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pcs_planos,
  public.pcs_fatores, public.pcs_avaliacoes_cargo, public.pcs_grades,
  public.pcs_pesquisa_salarial TO authenticated;
GRANT ALL ON public.pcs_planos, public.pcs_fatores,
  public.pcs_avaliacoes_cargo, public.pcs_grades,
  public.pcs_pesquisa_salarial TO service_role;

DROP POLICY IF EXISTS pcs_planos_select ON public.pcs_planos;
CREATE POLICY pcs_planos_select ON public.pcs_planos FOR SELECT TO authenticated
USING (
  deleted_at IS NULL AND (
    public.is_admin(auth.uid())
    OR empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);
DROP POLICY IF EXISTS pcs_planos_insert ON public.pcs_planos;
CREATE POLICY pcs_planos_insert ON public.pcs_planos FOR INSERT TO authenticated
WITH CHECK (deleted_at IS NULL AND public.pode_gerir_rh(empresa_id));
DROP POLICY IF EXISTS pcs_planos_update ON public.pcs_planos;
CREATE POLICY pcs_planos_update ON public.pcs_planos FOR UPDATE TO authenticated
USING (deleted_at IS NULL AND public.pode_gerir_rh(empresa_id))
WITH CHECK (public.pode_gerir_rh(empresa_id));
DROP POLICY IF EXISTS pcs_planos_delete ON public.pcs_planos;
CREATE POLICY pcs_planos_delete ON public.pcs_planos FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

DO $child_policies$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['pcs_fatores', 'pcs_avaliacoes_cargo', 'pcs_grades'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_select', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.pcs_pode_ver_plano(plano_id))',
      table_name || '_select', table_name
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_write', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.pcs_pode_gerir_plano(plano_id)) WITH CHECK (public.pcs_pode_gerir_plano(plano_id))',
      table_name || '_write', table_name
    );
  END LOOP;
END
$child_policies$;

DROP POLICY IF EXISTS pcs_pesquisa_select ON public.pcs_pesquisa_salarial;
CREATE POLICY pcs_pesquisa_select ON public.pcs_pesquisa_salarial FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
);
DROP POLICY IF EXISTS pcs_pesquisa_write ON public.pcs_pesquisa_salarial;
CREATE POLICY pcs_pesquisa_write ON public.pcs_pesquisa_salarial FOR ALL TO authenticated
USING (public.pode_gerir_rh(empresa_id))
WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE OR REPLACE FUNCTION public.pcs_gerar_grades(
  p_plano_id uuid,
  p_num_grades integer DEFAULT 8,
  p_salario_base_menor numeric DEFAULT NULL
)
RETURNS SETOF public.pcs_grades
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  min_points numeric;
  max_points numeric;
  point_step numeric;
  plan_row public.pcs_planos%ROWTYPE;
  salary_base numeric;
  progression numeric;
  grade_number integer;
  salary_mid numeric;
BEGIN
  IF NOT public.pcs_pode_gerir_plano(p_plano_id) THEN
    RAISE EXCEPTION 'not authorized to manage this PCS plan' USING ERRCODE = '42501';
  END IF;
  IF p_num_grades IS NULL OR p_num_grades < 2 OR p_num_grades > 30 THEN
    RAISE EXCEPTION 'p_num_grades must be between 2 and 30' USING ERRCODE = '22023';
  END IF;
  IF p_salario_base_menor IS NOT NULL AND p_salario_base_menor <= 0 THEN
    RAISE EXCEPTION 'p_salario_base_menor must be positive' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('pcs_grades:' || p_plano_id::text)::bigint);
  SELECT * INTO STRICT plan_row FROM public.pcs_planos
  WHERE id = p_plano_id AND deleted_at IS NULL FOR UPDATE;

  SELECT min(pontos_total), max(pontos_total) INTO min_points, max_points
  FROM public.pcs_avaliacoes_cargo WHERE plano_id = p_plano_id;
  IF min_points IS NULL OR max_points IS NULL OR max_points <= min_points THEN
    RAISE EXCEPTION 'at least two distinct evaluated scores are required' USING ERRCODE = '22023';
  END IF;

  salary_base := p_salario_base_menor;
  IF salary_base IS NULL THEN
    SELECT min(NULLIF(c.salario_base, 0)) INTO salary_base
    FROM public.pcs_avaliacoes_cargo a
    JOIN public.cargos c ON c.id = a.cargo_id
    WHERE a.plano_id = p_plano_id;
  END IF;
  IF salary_base IS NULL OR salary_base <= 0 THEN
    RAISE EXCEPTION 'a positive salary base is required' USING ERRCODE = '22023';
  END IF;

  point_step := (max_points - min_points) / p_num_grades;
  progression := 1 + ((100 - plan_row.overlap_pct) / 100.0)
    * (plan_row.amplitude_pct / 100.0);

  DELETE FROM public.pcs_grades WHERE plano_id = p_plano_id;
  FOR grade_number IN 1..p_num_grades LOOP
    salary_mid := round(salary_base * power(progression, grade_number - 1), 2);
    INSERT INTO public.pcs_grades (
      plano_id, ordem, nome, pontos_min, pontos_max,
      salario_min, salario_medio, salario_max
    ) VALUES (
      p_plano_id, grade_number, 'Grade ' || grade_number,
      round(min_points + point_step * (grade_number - 1), 4),
      round(CASE WHEN grade_number = p_num_grades THEN max_points
        ELSE min_points + point_step * grade_number END, 4),
      round(salary_mid / (1 + plan_row.amplitude_pct / 200.0), 2),
      salary_mid,
      round(salary_mid * (1 + plan_row.amplitude_pct / 200.0), 2)
    );
  END LOOP;

  RETURN QUERY SELECT g.* FROM public.pcs_grades g
  WHERE g.plano_id = p_plano_id ORDER BY g.ordem;
END
$function$;

CREATE OR REPLACE FUNCTION public.pcs_enquadramento(p_plano_id uuid)
RETURNS TABLE (
  colaborador_id uuid, colaborador_nome text, cargo_nome text, departamento text,
  salario_atual numeric, grade_nome text, grade_ordem integer,
  salario_min numeric, salario_medio numeric, salario_max numeric,
  comparatio numeric, situacao text, ajuste_necessario numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  WITH authorized_plan AS (
    SELECT p.* FROM public.pcs_planos p
    WHERE p.id = p_plano_id AND p.deleted_at IS NULL
      AND public.pcs_pode_ver_plano(p.id)
  ), evaluated AS (
    SELECT a.cargo_id, c.nome AS cargo_nome, a.pontos_total, a.plano_id
    FROM public.pcs_avaliacoes_cargo a
    JOIN public.cargos c ON c.id = a.cargo_id
    WHERE a.plano_id = p_plano_id
  )
  SELECT col.id, col.nome_completo, ev.cargo_nome, col.departamento,
    col.salario_base, grade.nome, grade.ordem,
    grade.salario_min, grade.salario_medio, grade.salario_max,
    round(col.salario_base / NULLIF(grade.salario_medio, 0), 4),
    CASE WHEN col.salario_base < grade.salario_min THEN 'abaixo_faixa'
      WHEN col.salario_base > grade.salario_max THEN 'acima_faixa'
      ELSE 'dentro_faixa' END,
    CASE WHEN col.salario_base < grade.salario_min
      THEN round(grade.salario_min - col.salario_base, 2) ELSE 0 END
  FROM authorized_plan plan
  JOIN public.colaboradores col
    ON col.empresa_id = plan.empresa_id AND col.status = 'ativo'
      AND col.salario_base IS NOT NULL
  JOIN evaluated ev ON ev.plano_id = plan.id
    AND ((col.cargo_id IS NOT NULL AND col.cargo_id = ev.cargo_id)
      OR (col.cargo_id IS NULL AND lower(btrim(col.cargo)) = lower(btrim(ev.cargo_nome))))
  JOIN LATERAL (
    SELECT g.* FROM public.pcs_grades g
    WHERE g.plano_id = plan.id
      AND ev.pontos_total BETWEEN g.pontos_min AND g.pontos_max
    ORDER BY g.ordem DESC LIMIT 1
  ) grade ON true
  ORDER BY grade.ordem DESC, col.nome_completo
$function$;

DROP FUNCTION IF EXISTS public.pcs_grades_mercado(uuid);
CREATE FUNCTION public.pcs_grades_mercado(p_plano_id uuid)
RETURNS TABLE (
  grade_id uuid, grade_nome text, ordem integer,
  pontos_min numeric, pontos_max numeric,
  salario_min numeric, salario_medio numeric, salario_max numeric,
  mercado_p50 numeric, cargos_com_mercado integer,
  posicionamento numeric, aderencia text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  WITH authorized_plan AS (
    SELECT p.* FROM public.pcs_planos p
    WHERE p.id = p_plano_id AND p.deleted_at IS NULL
      AND public.pcs_pode_ver_plano(p.id)
  ), market AS (
    SELECT DISTINCT ON (lower(btrim(s.cargo_referencia)))
      lower(btrim(s.cargo_referencia)) AS key, s.p50
    FROM public.pcs_pesquisa_salarial s
    JOIN authorized_plan p ON p.empresa_id = s.empresa_id
    WHERE s.p50 IS NOT NULL
    ORDER BY lower(btrim(s.cargo_referencia)), s.data_referencia DESC, s.id DESC
  ), by_grade AS (
    SELECT g.id, g.nome, g.ordem, g.pontos_min, g.pontos_max,
      g.salario_min, g.salario_medio, g.salario_max,
      avg(m.p50)::numeric AS market_p50, count(m.p50)::integer AS market_jobs
    FROM authorized_plan p
    JOIN public.pcs_grades g ON g.plano_id = p.id
    LEFT JOIN public.pcs_avaliacoes_cargo a ON a.plano_id = g.plano_id
      AND a.pontos_total BETWEEN g.pontos_min AND g.pontos_max
    LEFT JOIN public.cargos c ON c.id = a.cargo_id
    LEFT JOIN market m ON m.key = lower(btrim(c.nome))
    GROUP BY g.id, g.nome, g.ordem, g.pontos_min, g.pontos_max,
      g.salario_min, g.salario_medio, g.salario_max
  )
  SELECT id, nome, by_grade.ordem, by_grade.pontos_min, by_grade.pontos_max,
    by_grade.salario_min, by_grade.salario_medio, by_grade.salario_max,
    round(market_p50, 2), market_jobs,
    round(by_grade.salario_medio / NULLIF(market_p50, 0), 4),
    CASE WHEN market_p50 IS NULL THEN 'sem_referencia'
      WHEN by_grade.salario_medio < market_p50 * 0.95 THEN 'abaixo_mercado'
      WHEN by_grade.salario_medio > market_p50 * 1.05 THEN 'acima_mercado'
      ELSE 'alinhado' END
  FROM by_grade ORDER BY by_grade.ordem
$function$;

CREATE OR REPLACE FUNCTION public.pcs_simular_impacto(
  p_plano_id uuid,
  p_encargos_pct numeric DEFAULT 36.8
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.pcs_pode_ver_plano(p_plano_id) THEN
    RAISE EXCEPTION 'not authorized to read this PCS plan' USING ERRCODE = '42501';
  END IF;
  IF p_encargos_pct IS NULL OR p_encargos_pct < 0 OR p_encargos_pct > 200 THEN
    RAISE EXCEPTION 'p_encargos_pct must be between 0 and 200' USING ERRCODE = '22023';
  END IF;
  SELECT jsonb_build_object(
    'colaboradores_enquadrados', count(*),
    'abaixo_faixa', count(*) FILTER (WHERE situacao = 'abaixo_faixa'),
    'dentro_faixa', count(*) FILTER (WHERE situacao = 'dentro_faixa'),
    'acima_faixa', count(*) FILTER (WHERE situacao = 'acima_faixa'),
    'folha_atual', round(COALESCE(sum(salario_atual), 0), 2),
    'ajuste_mensal', round(COALESCE(sum(ajuste_necessario), 0), 2),
    'ajuste_com_encargos', round(COALESCE(sum(ajuste_necessario), 0) * (1 + p_encargos_pct / 100.0), 2),
    'impacto_anual', round(COALESCE(sum(ajuste_necessario), 0) * (1 + p_encargos_pct / 100.0) * 13.33, 2),
    'impacto_pct_folha', round(COALESCE(sum(ajuste_necessario), 0) / NULLIF(sum(salario_atual), 0) * 100, 2),
    'comparatio_medio', round(avg(comparatio), 4),
    'encargos_pct', p_encargos_pct
  ) INTO result FROM public.pcs_enquadramento(p_plano_id);
  RETURN COALESCE(result, '{}'::jsonb);
END
$function$;

REVOKE ALL ON FUNCTION public.pcs_gerar_grades(uuid, integer, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pcs_enquadramento(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pcs_grades_mercado(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pcs_simular_impacto(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pcs_gerar_grades(uuid, integer, numeric),
  public.pcs_enquadramento(uuid), public.pcs_grades_mercado(uuid),
  public.pcs_simular_impacto(uuid, numeric) TO authenticated, service_role;

COMMENT ON TABLE public.pcs_planos IS 'PCS plans, versioned and tenant scoped.';
COMMENT ON TABLE public.pcs_fatores IS 'Server-validated weighted PCS factors and allowed scores.';
COMMENT ON TABLE public.pcs_avaliacoes_cargo IS 'Cargo evaluation whose total is always calculated by a trigger.';
COMMENT ON TABLE public.pcs_grades IS 'Transactionally generated salary ranges for a PCS plan.';
COMMENT ON TABLE public.pcs_pesquisa_salarial IS 'Tenant-scoped external salary benchmark observations.';
