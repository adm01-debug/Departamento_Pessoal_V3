-- P1: align the legacy provision table with its application contract and make
-- monthly provision replacement + mandatory audit one database transaction.

DO $preflight$
DECLARE
  duplicates_exist boolean;
  invalid_columns text[];
BEGIN
  IF to_regclass('public.provisoes_folha') IS NULL
     OR to_regclass('public.provisoes_mensais') IS NULL
     OR to_regclass('public.audit_log') IS NULL
     OR to_regclass('public.colaboradores') IS NULL THEN
    RAISE EXCEPTION 'atomic provisions contract requires provisoes_folha, provisoes_mensais, colaboradores and audit_log';
  END IF;

  SELECT array_agg(spec.table_name || '.' || spec.column_name ORDER BY 1)
  INTO invalid_columns
  FROM (VALUES
    ('provisoes_folha','empresa_id','uuid'),
    ('provisoes_folha','colaborador_id','uuid'),
    ('provisoes_folha','competencia','text'),
    ('provisoes_folha','valor_13_salario','numeric'),
    ('provisoes_folha','valor_ferias','numeric'),
    ('provisoes_folha','encargos_provisao','numeric'),
    ('provisoes_mensais','empresa_id','uuid'),
    ('provisoes_mensais','colaborador_id','uuid'),
    ('provisoes_mensais','competencia','date'),
    ('provisoes_mensais','tipo','text'),
    ('provisoes_mensais','valor_principal','numeric'),
    ('provisoes_mensais','encargos_inss','numeric'),
    ('provisoes_mensais','encargos_fgts','numeric'),
    ('colaboradores','id','uuid'),
    ('colaboradores','empresa_id','uuid'),
    ('audit_log','tabela','text'),
    ('audit_log','registro_id','uuid'),
    ('audit_log','acao','text'),
    ('audit_log','user_id','uuid'),
    ('audit_log','dados_novos','jsonb')
  ) AS spec(table_name,column_name,type_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_attribute AS a
    WHERE a.attrelid = to_regclass('public.' || spec.table_name)
      AND a.attname = spec.column_name
      AND NOT a.attisdropped
      AND a.atttypid = to_regtype(spec.type_name)
  );
  IF invalid_columns IS NOT NULL THEN
    RAISE EXCEPTION 'atomic provisions contract has missing or incompatible columns: %',
      array_to_string(invalid_columns, ', ');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.provisoes_folha
    GROUP BY empresa_id, colaborador_id, competencia
    HAVING count(*) > 1
  ) INTO duplicates_exist;
  IF duplicates_exist THEN
    RAISE EXCEPTION 'provisoes_folha contains duplicate company/employee/competence rows';
  END IF;
END
$preflight$;

ALTER TABLE public.provisoes_folha
  ADD COLUMN IF NOT EXISTS valor_total numeric(15,2);

CREATE OR REPLACE FUNCTION public.set_provisoes_folha_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
  NEW.valor_total := round(
    COALESCE(NEW.valor_13_salario, 0)
    + COALESCE(NEW.valor_ferias, 0)
    + COALESCE(NEW.encargos_provisao, 0),
    2
  );
  RETURN NEW;
END
$function$;

UPDATE public.provisoes_folha
SET valor_total = round(
  COALESCE(valor_13_salario, 0)
  + COALESCE(valor_ferias, 0)
  + COALESCE(encargos_provisao, 0),
  2
)
WHERE valor_total IS DISTINCT FROM round(
  COALESCE(valor_13_salario, 0)
  + COALESCE(valor_ferias, 0)
  + COALESCE(encargos_provisao, 0),
  2
);

ALTER TABLE public.provisoes_folha
  ALTER COLUMN valor_total SET DEFAULT 0,
  ALTER COLUMN valor_total SET NOT NULL;

DROP TRIGGER IF EXISTS tr_set_provisoes_folha_total ON public.provisoes_folha;
CREATE TRIGGER tr_set_provisoes_folha_total
BEFORE INSERT OR UPDATE OF valor_13_salario, valor_ferias, encargos_provisao, valor_total
ON public.provisoes_folha
FOR EACH ROW EXECUTE FUNCTION public.set_provisoes_folha_total();

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.provisoes_folha'::regclass
      AND conname = 'provisoes_folha_empresa_colaborador_competencia_key'
  ) THEN
    ALTER TABLE public.provisoes_folha
      ADD CONSTRAINT provisoes_folha_empresa_colaborador_competencia_key
      UNIQUE (empresa_id, colaborador_id, competencia);
  END IF;
END
$constraint$;

CREATE OR REPLACE FUNCTION public.replace_monthly_provisions(
  p_empresa_id uuid,
  p_competencia text,
  p_rows jsonb,
  p_user_id uuid,
  p_audit_data jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  inserted_count integer;
  competence_date date;
BEGIN
  IF p_empresa_id IS NULL OR p_user_id IS NULL
     OR p_competencia !~ '^\d{4}-(0[1-9]|1[0-2])$'
     OR jsonb_typeof(p_rows) <> 'array'
     OR jsonb_array_length(p_rows) > 20000
     OR jsonb_typeof(p_audit_data) <> 'object' THEN
    RAISE EXCEPTION 'invalid monthly provision replacement arguments';
  END IF;
  competence_date := to_date(p_competencia || '-01', 'YYYY-MM-DD');

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_rows) AS row_data(item)
    WHERE jsonb_typeof(item) <> 'object'
       OR COALESCE(item->>'colaborador_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       OR item->>'tipo' NOT IN ('ferias', '13_salario')
       OR jsonb_typeof(item->'valor_principal') <> 'number'
       OR jsonb_typeof(item->'encargos_inss') <> 'number'
       OR jsonb_typeof(item->'encargos_fgts') <> 'number'
       OR (item->>'valor_principal')::numeric < 0
       OR (item->>'encargos_inss')::numeric < 0
       OR (item->>'encargos_fgts')::numeric < 0
  ) THEN
    RAISE EXCEPTION 'invalid monthly provision row';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_rows) AS row_data(item)
    LEFT JOIN public.colaboradores AS c
      ON c.id = (item->>'colaborador_id')::uuid
     AND c.empresa_id = p_empresa_id
    WHERE c.id IS NULL
  ) THEN
    RAISE EXCEPTION 'monthly provision collaborator is outside the company';
  END IF;

  -- Serialize recalculations for the same tenant/month. If any row or the
  -- mandatory audit insert fails, PostgreSQL rolls back the deletion too.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_empresa_id::text || ':' || p_competencia, 0));

  DELETE FROM public.provisoes_mensais
  WHERE empresa_id = p_empresa_id AND competencia = competence_date;

  INSERT INTO public.provisoes_mensais (
    empresa_id, colaborador_id, competencia, tipo,
    valor_principal, encargos_inss, encargos_fgts
  )
  SELECT
    p_empresa_id,
    (item->>'colaborador_id')::uuid,
    competence_date,
    item->>'tipo',
    (item->>'valor_principal')::numeric,
    (item->>'encargos_inss')::numeric,
    (item->>'encargos_fgts')::numeric
  FROM jsonb_array_elements(p_rows) AS item;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count <> jsonb_array_length(p_rows) THEN
    RAISE EXCEPTION 'monthly provision replacement row count mismatch';
  END IF;

  INSERT INTO public.audit_log (
    tabela, registro_id, acao, user_id, dados_novos
  ) VALUES (
    'provisoes_mensais', gen_random_uuid(), 'CALCULATE_BATCH', p_user_id, p_audit_data
  );

  RETURN inserted_count;
END
$function$;

REVOKE ALL ON FUNCTION public.replace_monthly_provisions(uuid, text, jsonb, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_monthly_provisions(uuid, text, jsonb, uuid, jsonb)
  TO service_role;

REVOKE ALL ON FUNCTION public.set_provisoes_folha_total() FROM PUBLIC;
