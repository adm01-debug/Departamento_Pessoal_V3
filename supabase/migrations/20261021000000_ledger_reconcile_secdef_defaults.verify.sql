-- Verifica que ambas as versões estão no ledger após a reconciliação.
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(v, ', ') INTO missing
  FROM (
    VALUES ('20261015170000'), ('20261018170000')
  ) AS expected(v)
  WHERE NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations s
    WHERE s.version = expected.v
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Versões ausentes no ledger após reconciliação: %', missing;
  END IF;
END;
$$;
SELECT 'ok';
