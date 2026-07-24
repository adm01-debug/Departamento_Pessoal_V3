-- Issue 44: Adiciona coluna ativo em turnos.
--
-- 20260724000800_fix_turnos_missing_business_columns.sql adicionou
-- nome, horario_inicio, horario_fim, intervalo_minutos, cor
-- mas não incluiu a coluna ativo que consta na migration original
-- 20260315212539_* (linha 101: ativo BOOLEAN DEFAULT true).
--
-- Qualquer query que filtre ativo = true (e.g. listarTurnos ativos) ou
-- qualquer INSERT que envie ativo falhará com "column does not exist".

ALTER TABLE public.turnos
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
