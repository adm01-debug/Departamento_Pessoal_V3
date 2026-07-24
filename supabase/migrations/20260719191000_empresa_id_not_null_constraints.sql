-- Ensure empresa_id is never null on tenant-scoped business tables.
-- This prevents accidental data leaks across tenants if application code
-- fails to set empresa_id before insert.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'colaboradores',
      'folhas_pagamento',
      'despesas',
      'dependentes',
      'contas_bancarias',
      'ferias',
      'rescisoes',
      'beneficios',
      'asos',
      'batidas_ponto',
      'holerites'
    ])
  LOOP
    -- Only add constraint if column exists and doesn't already have NOT NULL
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = 'empresa_id'
        AND is_nullable = 'YES'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN empresa_id SET NOT NULL',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- empresa_id is typed UUID — empty strings are rejected at the type level,
-- so no CHECK constraint is needed. The NOT NULL above is sufficient.
-- (UUID columns cannot store '' — PostgreSQL rejects the cast at constraint validation time.)
