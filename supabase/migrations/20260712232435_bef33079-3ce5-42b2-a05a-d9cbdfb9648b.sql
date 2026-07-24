
DO $$
DECLARE
  r TEXT;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'CREATE INDEX IF NOT EXISTS idx_admissoes_empresa_created ON public.admissoes (empresa_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_faltas_empresa_data ON public.faltas (empresa_id, data DESC)',
    'CREATE INDEX IF NOT EXISTS idx_historico_salarial_empresa_created ON public.historico_salarial (empresa_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_registros_ponto_empresa_data ON public.registros_ponto (empresa_id, data DESC)'
  ]) LOOP
    BEGIN
      EXECUTE r;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END $$;
