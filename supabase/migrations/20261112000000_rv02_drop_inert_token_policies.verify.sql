-- ok = mesma condição do probe RV-02 (scripts/probes/run-probes.mjs).
SELECT 'ok' WHERE (NOT has_table_privilege('anon', 'public.medidas_ciencia_tokens', 'SELECT'))
  AND (NOT has_table_privilege('authenticated', 'public.medidas_ciencia_tokens', 'SELECT'))
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'medidas_ciencia_tokens'
  );
