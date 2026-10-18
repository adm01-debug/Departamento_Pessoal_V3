-- Onda 5 (ponto): colunas de apuração CLT em registros_ponto.
-- horas_extras_50/horas_extras_100 = partes PAGAS na folha (50% dias úteis,
-- 100% domingo/feriado). horas_extras segue = total trabalhado além da
-- jornada (espelho/auditoria). he_banco_horas = parte enviada ao banco de
-- horas (não paga). horas_noturnas = minutos 22h-05h (adicional 20%).
ALTER TABLE public.registros_ponto
  ADD COLUMN IF NOT EXISTS horas_extras_50 interval,
  ADD COLUMN IF NOT EXISTS horas_extras_100 interval,
  ADD COLUMN IF NOT EXISTS horas_noturnas interval,
  ADD COLUMN IF NOT EXISTS he_banco_horas interval;

-- Fail-closed: as 4 colunas precisam existir ao final.
DO $$
DECLARE
  v_missing text;
BEGIN
  SELECT string_agg(c, ', ') INTO v_missing
  FROM (VALUES ('horas_extras_50'), ('horas_extras_100'), ('horas_noturnas'), ('he_banco_horas')) AS s(c)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'registros_ponto' AND column_name = s.c
  );
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'registros_ponto: colunas ausentes após ALTER: %', v_missing;
  END IF;
END $$;
