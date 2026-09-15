-- P1: make the physical company tax configuration match payroll provision rules.
DO $preflight$
BEGIN
  IF to_regclass('public.empresas') IS NULL THEN
    RAISE EXCEPTION 'company payroll tax contract requires public.empresas';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                 WHERE n.nspname='public' AND t.typname='regime_tributario') THEN
    CREATE TYPE public.regime_tributario AS ENUM (
      'simples_nacional', 'lucro_presumido', 'lucro_real', 'mei'
    );
  END IF;
END
$preflight$;

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS rat numeric,
  ADD COLUMN IF NOT EXISTS fap numeric,
  ADD COLUMN IF NOT EXISTS terceiros numeric,
  ADD COLUMN IF NOT EXISTS simples_anexo text,
  ADD COLUMN IF NOT EXISTS aliquota_encargos_folha numeric;

-- The bootstrap schema historically created this column as nullable varchar.
-- Convert through text so this migration is idempotent for either physical type.
ALTER TABLE public.empresas
  ALTER COLUMN regime_tributario TYPE text USING regime_tributario::text;
UPDATE public.empresas
SET regime_tributario = CASE
  WHEN regime_tributario IS NULL OR btrim(regime_tributario) = '' THEN 'lucro_real'
  WHEN lower(btrim(regime_tributario)) IN ('simples', 'simples nacional') THEN 'simples_nacional'
  WHEN lower(btrim(regime_tributario)) IN ('presumido', 'lucro presumido') THEN 'lucro_presumido'
  WHEN lower(btrim(regime_tributario)) IN ('real', 'lucro real') THEN 'lucro_real'
  ELSE lower(btrim(regime_tributario))
END;
DO $validate_regime$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.empresas
    WHERE regime_tributario NOT IN ('simples_nacional','lucro_presumido','lucro_real','mei')
  ) THEN
    RAISE EXCEPTION 'invalid legacy regime_tributario; classify it before migration';
  END IF;
END
$validate_regime$;
ALTER TABLE public.empresas
  ALTER COLUMN regime_tributario TYPE public.regime_tributario
    USING regime_tributario::public.regime_tributario,
  ALTER COLUMN regime_tributario SET DEFAULT 'lucro_real'::public.regime_tributario,
  ALTER COLUMN regime_tributario SET NOT NULL;

-- Old screens persisted percentage points (1/2/3 and 5.8) instead of
-- fractions (0.01/0.02/0.03 and 0.058). One is included deliberately: a RAT
-- base of 100% is not a legal configuration, while 1% is common.
UPDATE public.empresas SET rat = rat / 100 WHERE rat >= 1 AND rat <= 100;
UPDATE public.empresas SET terceiros = terceiros / 100 WHERE terceiros >= 1 AND terceiros <= 100;
UPDATE public.empresas SET rat=0.02 WHERE rat IS NULL;
UPDATE public.empresas SET fap=1 WHERE fap IS NULL;
UPDATE public.empresas SET terceiros=0.058 WHERE terceiros IS NULL;

ALTER TABLE public.empresas
  ALTER COLUMN rat SET DEFAULT 0.02,
  ALTER COLUMN rat SET NOT NULL,
  ALTER COLUMN fap SET DEFAULT 1,
  ALTER COLUMN fap SET NOT NULL,
  ALTER COLUMN terceiros SET DEFAULT 0.058,
  ALTER COLUMN terceiros SET NOT NULL;

ALTER TABLE public.empresas DROP CONSTRAINT IF EXISTS empresas_rat_fraction_check;
ALTER TABLE public.empresas ADD CONSTRAINT empresas_rat_fraction_check CHECK (rat BETWEEN 0 AND 0.03);
ALTER TABLE public.empresas DROP CONSTRAINT IF EXISTS empresas_fap_multiplier_check;
ALTER TABLE public.empresas ADD CONSTRAINT empresas_fap_multiplier_check CHECK (fap BETWEEN 0 AND 2);
ALTER TABLE public.empresas DROP CONSTRAINT IF EXISTS empresas_terceiros_fraction_check;
ALTER TABLE public.empresas ADD CONSTRAINT empresas_terceiros_fraction_check CHECK (terceiros BETWEEN 0 AND 0.2);
ALTER TABLE public.empresas DROP CONSTRAINT IF EXISTS empresas_simples_anexo_check;
ALTER TABLE public.empresas ADD CONSTRAINT empresas_simples_anexo_check
  CHECK (simples_anexo IS NULL OR simples_anexo IN ('I','II','III','IV','V'));
ALTER TABLE public.empresas DROP CONSTRAINT IF EXISTS empresas_encargos_folha_fraction_check;
ALTER TABLE public.empresas ADD CONSTRAINT empresas_encargos_folha_fraction_check
  CHECK (aliquota_encargos_folha IS NULL OR aliquota_encargos_folha BETWEEN 0 AND 1);

COMMENT ON COLUMN public.empresas.simples_anexo IS
  'Anexo tributário vigente; obrigatório no cálculo quando regime=simples_nacional e não houver alíquota efetiva.';
COMMENT ON COLUMN public.empresas.aliquota_encargos_folha IS
  'Alíquota efetiva empresarial revisada (fração 0..1), usada como override explícito nas provisões.';
