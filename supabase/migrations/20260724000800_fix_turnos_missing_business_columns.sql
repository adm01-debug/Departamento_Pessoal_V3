-- Issue 36: Adiciona colunas de negócio ausentes em turnos.
--
-- 2025122813133704_create_turnos.sql (stub gerado automaticamente) criou
-- a tabela com campos genéricos (descricao, valor, data_inicio, data_fim, status).
-- 20251228131619_create_turnos.sql tentou recriar com campos corretos mas foi
-- no-op pois a tabela já existia (CREATE TABLE IF NOT EXISTS).
-- turnoService.ts ordena por nome, insere/exibe nome/horario_inicio/horario_fim/cor;
-- TurnosPage.tsx também usa intervalo_minutos. Sem essas colunas as queries retornam
-- NULL para todos os campos e a ordenação por nome falha silenciosamente.
ALTER TABLE public.turnos
  ADD COLUMN IF NOT EXISTS nome              TEXT,
  ADD COLUMN IF NOT EXISTS horario_inicio    TEXT,
  ADD COLUMN IF NOT EXISTS horario_fim       TEXT,
  ADD COLUMN IF NOT EXISTS intervalo_minutos INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS cor               TEXT DEFAULT '#3b82f6';

-- Índice de suporte para listagem por empresa ordenada por nome
CREATE INDEX IF NOT EXISTS idx_turnos_empresa_nome
  ON public.turnos (empresa_id, nome);
