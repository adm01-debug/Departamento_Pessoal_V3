-- Garante que ferias.periodo_aquisitivo_id exista antes dos triggers e constraints
-- que dependem dela (20260722195902, 20260722200247).
--
-- Problema: 003_folha_ferias_ponto.sql cria public.ferias SEM periodo_aquisitivo_id.
-- A migração 20251216170845_* recria a tabela com IF NOT EXISTS, tornando-se no-op.
-- Logo, em bancos onde 003_ foi aplicado primeiro, a coluna nunca é criada.
ALTER TABLE public.ferias
  ADD COLUMN IF NOT EXISTS periodo_aquisitivo_id uuid
    REFERENCES public.periodos_aquisitivos(id) ON DELETE SET NULL;
