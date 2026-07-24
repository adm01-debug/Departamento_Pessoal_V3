-- Fixup: add missing columns to afastamentos table
-- Required before 20260712214656 (ADD CONSTRAINT checks) and the WORM trigger in 20260712213407
ALTER TABLE public.afastamentos ADD COLUMN IF NOT EXISTS data_fim_prevista DATE;
ALTER TABLE public.afastamentos ADD COLUMN IF NOT EXISTS data_fim_real DATE;
ALTER TABLE public.afastamentos ADD COLUMN IF NOT EXISTS medico_nome TEXT;
ALTER TABLE public.afastamentos ADD COLUMN IF NOT EXISTS medico_crm TEXT;
ALTER TABLE public.afastamentos ADD COLUMN IF NOT EXISTS numero_beneficio TEXT;
ALTER TABLE public.afastamentos ADD COLUMN IF NOT EXISTS data_pericia DATE;
ALTER TABLE public.afastamentos ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMPTZ;
ALTER TABLE public.afastamentos ADD COLUMN IF NOT EXISTS aprovado_por UUID;
ALTER TABLE public.afastamentos ADD COLUMN IF NOT EXISTS dias_empresa INTEGER DEFAULT 0;
ALTER TABLE public.afastamentos ADD COLUMN IF NOT EXISTS dias_inss INTEGER DEFAULT 0;
