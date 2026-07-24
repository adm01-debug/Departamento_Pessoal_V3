
-- Melhoria 35: índices para as 3 queries mais quentes identificadas via pg_stat_statements
DO $$
DECLARE
  r TEXT;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'CREATE INDEX IF NOT EXISTS idx_empresas_razao_social ON public.empresas (razao_social)',
    'CREATE INDEX IF NOT EXISTS idx_metricas_processamento_timestamp_desc ON public.metricas_processamento (timestamp DESC)',
    'CREATE INDEX IF NOT EXISTS idx_notificacoes_empresa_created_desc ON public.notificacoes (empresa_id, created_at DESC)'
  ]) LOOP
    BEGIN
      EXECUTE r;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END $$;
