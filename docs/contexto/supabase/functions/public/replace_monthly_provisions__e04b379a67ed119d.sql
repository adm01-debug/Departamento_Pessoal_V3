CREATE OR REPLACE FUNCTION public.replace_monthly_provisions(p_empresa_id uuid, p_competencia text, p_rows jsonb, p_user_id uuid, p_audit_data jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
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
       OR COALESCE(item->>'colaborador_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
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
    'provisoes_mensais', gen_random_uuid(), 'PROVISOES_CALC', p_user_id,
    COALESCE(p_audit_data, '{}'::jsonb) || jsonb_build_object('empresa_id', p_empresa_id, 'evento', 'CALCULATE_BATCH')
  );

  RETURN inserted_count;
END
$function$
