-- Fixup: add missing columns to faltas table (runs just before vw_kpi_absenteismo)
-- 2025122813133705_create_faltas.sql creates faltas with data_inicio/data_fim but
-- NOT data or dias_total. 20260317001900 tries CREATE TABLE IF NOT EXISTS with
-- those columns but is skipped. vw_kpi_absenteismo in 20260317001935 uses both.

ALTER TABLE public.faltas ADD COLUMN IF NOT EXISTS data DATE;
ALTER TABLE public.faltas ADD COLUMN IF NOT EXISTS dias_total INTEGER DEFAULT 1;
ALTER TABLE public.faltas ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'falta';
ALTER TABLE public.faltas ADD COLUMN IF NOT EXISTS justificada BOOLEAN DEFAULT false;
ALTER TABLE public.faltas ADD COLUMN IF NOT EXISTS motivo TEXT;
ALTER TABLE public.faltas ADD COLUMN IF NOT EXISTS cid TEXT;
ALTER TABLE public.faltas ADD COLUMN IF NOT EXISTS horas_falta INTERVAL;
ALTER TABLE public.faltas ADD COLUMN IF NOT EXISTS documento_url TEXT;

-- Back-fill data from data_inicio for existing rows
UPDATE public.faltas SET data = data_inicio WHERE data IS NULL AND data_inicio IS NOT NULL;

-- Index on data for the view's WHERE clause
CREATE INDEX IF NOT EXISTS idx_faltas_data ON public.faltas(data);
