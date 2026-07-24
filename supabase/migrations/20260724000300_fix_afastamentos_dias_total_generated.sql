-- Issue 32: Adiciona coluna computada dias_total em afastamentos.
--
-- 20260712214640_fixup_afastamentos_cols.sql criou dias_empresa e dias_inss,
-- mas a coluna derivada dias_total (GENERATED ALWAYS AS) nunca foi criada.
-- Qualquer código que lê afastamentos.dias_total obtém NULL em vez da soma.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'afastamentos'
      AND column_name = 'dias_total'
  ) THEN
    ALTER TABLE public.afastamentos
      ADD COLUMN dias_total INTEGER
        GENERATED ALWAYS AS (COALESCE(dias_empresa, 0) + COALESCE(dias_inss, 0)) STORED;
  END IF;
END $$;
