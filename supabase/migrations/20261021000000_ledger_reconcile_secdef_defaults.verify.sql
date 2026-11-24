-- Verifica que ambas as versões estão no ledger após a reconciliação.
-- SELECT CASE evita command tag 'DO' na saída (psql -t -A exige apenas 'ok').
SELECT CASE
  WHEN (
    SELECT count(*) FROM supabase_migrations.schema_migrations
    WHERE version IN ('20261015170000', '20261018170000')
  ) = 2
  THEN 'ok'
  ELSE 'fail: versões ausentes no ledger — ' || coalesce((
    SELECT string_agg(v, ', ')
    FROM (VALUES ('20261015170000'), ('20261018170000')) AS expected(v)
    WHERE NOT EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations s
      WHERE s.version = expected.v
    )
  ), '?')
END;
