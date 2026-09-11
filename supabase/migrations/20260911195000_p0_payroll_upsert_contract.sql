-- P0: database invariants required by the payroll upsert contract.
--
-- A folha is unique per tenant, competence and type. An item is unique per
-- folha/colaborador. Do not silently delete duplicate historical data: abort
-- so it can be classified before the invariant is introduced.

DO $preflight$
DECLARE
  missing_columns text[];
BEGIN
  IF to_regclass('public.folhas_pagamento') IS NULL
     OR to_regclass('public.folha_itens') IS NULL THEN
    RAISE EXCEPTION
      'P0 payroll upsert remediation requires public.folhas_pagamento and public.folha_itens';
  END IF;

  SELECT array_agg(column_name ORDER BY column_name)
    INTO missing_columns
  FROM unnest(ARRAY['empresa_id', 'competencia', 'tipo']) AS expected(column_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.folhas_pagamento'::regclass
      AND attname = expected.column_name
      AND NOT attisdropped
  );
  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'P0 payroll upsert remediation missing folhas_pagamento columns: %', array_to_string(missing_columns, ', ');
  END IF;

  SELECT array_agg(column_name ORDER BY column_name)
    INTO missing_columns
  FROM unnest(ARRAY['folha_id', 'colaborador_id']) AS expected(column_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.folha_itens'::regclass
      AND attname = expected.column_name
      AND NOT attisdropped
  );
  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'P0 payroll upsert remediation missing folha_itens columns: %', array_to_string(missing_columns, ', ');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.folhas_pagamento
    GROUP BY empresa_id, competencia, tipo
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'P0 payroll upsert remediation requires deduplicated folhas_pagamento(empresa_id, competencia, tipo)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.folha_itens
    GROUP BY folha_id, colaborador_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'P0 payroll upsert remediation requires deduplicated folha_itens(folha_id, colaborador_id)';
  END IF;
END
$preflight$;

DO $constraints$
BEGIN
  -- Check the key by columns rather than its historical name. Earlier
  -- migrations used both generated and named constraints; an equivalent
  -- existing unique key is already sufficient for PostgREST's ON CONFLICT
  -- inference and must not result in a redundant index.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.folhas_pagamento'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.folhas_pagamento'::regclass AND attname = 'empresa_id' AND NOT attisdropped),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.folhas_pagamento'::regclass AND attname = 'competencia' AND NOT attisdropped),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.folhas_pagamento'::regclass AND attname = 'tipo' AND NOT attisdropped)
      ]::smallint[]
  ) THEN
    ALTER TABLE public.folhas_pagamento
      ADD CONSTRAINT folhas_pagamento_empresa_comp_tipo_unique
      UNIQUE (empresa_id, competencia, tipo);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.folha_itens'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.folha_itens'::regclass AND attname = 'folha_id' AND NOT attisdropped),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.folha_itens'::regclass AND attname = 'colaborador_id' AND NOT attisdropped)
      ]::smallint[]
  ) THEN
    ALTER TABLE public.folha_itens
      ADD CONSTRAINT folha_itens_folha_colaborador_unique
      UNIQUE (folha_id, colaborador_id);
  END IF;
END
$constraints$;
