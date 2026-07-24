-- Issue 39: Adiciona colunas de negócio ausentes em escalas.
--
-- 2025122813133603_create_escalas.sql (stub, 16 dígitos) ordena ANTES de
-- 20260306004825_* (14 dígitos) e criou a tabela com campos genéricos
-- (descricao, valor, data_inicio, data_fim, status). A migration correta foi
-- NO-OP (CREATE TABLE IF NOT EXISTS). Nenhuma migration posterior adicionou
-- as colunas necessárias.
--
-- EscalasPage.tsx ordena por nome (.order('nome')) e insere
-- nome, tipo, dias_trabalho, dias_folga, horario_entrada, horario_saida,
-- intervalo_minutos. Sem essas colunas todas as queries falham com
-- "column does not exist".

ALTER TABLE public.escalas
  ADD COLUMN IF NOT EXISTS nome               TEXT,
  ADD COLUMN IF NOT EXISTS tipo               TEXT DEFAULT 'padrao',
  ADD COLUMN IF NOT EXISTS dias_trabalho      INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS dias_folga         INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS horario_entrada    TEXT,
  ADD COLUMN IF NOT EXISTS horario_saida      TEXT,
  ADD COLUMN IF NOT EXISTS intervalo_minutos  INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS ativo              BOOLEAN DEFAULT true;

-- Índice de suporte para listagem por empresa ordenada por nome
CREATE INDEX IF NOT EXISTS idx_escalas_empresa_nome
  ON public.escalas (empresa_id, nome);
