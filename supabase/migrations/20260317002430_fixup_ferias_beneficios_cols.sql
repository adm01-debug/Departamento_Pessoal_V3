-- Fixup: add missing columns to ferias and beneficios tables (runs just before 20260317002431)
--
-- ferias: 003_folha_ferias_ponto.sql created the table with periodo_gozo_inicio/fim.
-- 20250102000000_dp_production.sql and 20251216170845 tried CREATE TABLE IF NOT EXISTS
-- with data_inicio/data_fim but were skipped. vw_ferias_resumo in 20260317002431 uses both.
--
-- beneficios: 004_beneficios_afastamentos.sql created the table with valor_padrao etc.
-- 20260306004911 tried CREATE TABLE IF NOT EXISTS with valor/colaborador_id but was skipped.
-- vw_kpi_beneficios_custo in 20260317002431 uses valor, valor_empresa, valor_colaborador,
-- colaborador_id.

-- ferias: alias columns for data_inicio / data_fim
ALTER TABLE public.ferias ADD COLUMN IF NOT EXISTS data_inicio DATE;
ALTER TABLE public.ferias ADD COLUMN IF NOT EXISTS data_fim DATE;

-- Back-fill from the original column names
UPDATE public.ferias
  SET data_inicio = periodo_gozo_inicio
  WHERE data_inicio IS NULL AND periodo_gozo_inicio IS NOT NULL;

UPDATE public.ferias
  SET data_fim = periodo_gozo_fim
  WHERE data_fim IS NULL AND periodo_gozo_fim IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ferias_data_inicio ON public.ferias(data_inicio);

-- beneficios: add columns that vw_kpi_beneficios_custo references
ALTER TABLE public.beneficios ADD COLUMN IF NOT EXISTS valor DECIMAL(12,2);
ALTER TABLE public.beneficios ADD COLUMN IF NOT EXISTS valor_empresa DECIMAL(12,2);
ALTER TABLE public.beneficios ADD COLUMN IF NOT EXISTS valor_colaborador DECIMAL(12,2);
ALTER TABLE public.beneficios ADD COLUMN IF NOT EXISTS colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE;
