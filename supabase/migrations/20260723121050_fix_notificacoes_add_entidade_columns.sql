-- Garante colunas entidade_tipo, entidade_id e data_referencia em notificacoes.
--
-- Problema: 005_esocial_auditoria.sql cria public.notificacoes sem essas colunas.
-- A migração 20251220131540_* que as inclui usa CREATE TABLE IF NOT EXISTS → no-op.
-- 20251220131541_fixup adicionou user_id mas não as colunas de entidade.
-- Resultado: migração 20260723121100 falha ao criar índice que as referencia:
--   ERROR: column "entidade_tipo" does not exist (SQLSTATE 42703)
ALTER TABLE public.notificacoes
  ADD COLUMN IF NOT EXISTS entidade_tipo TEXT,
  ADD COLUMN IF NOT EXISTS entidade_id  UUID,
  ADD COLUMN IF NOT EXISTS data_referencia DATE;
