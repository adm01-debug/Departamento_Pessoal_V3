-- Issue 20: Corrige valor padrão de faltas.status de 'ativo' para 'pendente'.
--
-- 2025122813133705_create_faltas.sql (stub) criou status DEFAULT 'ativo'.
-- 20260713110053_* adicionou um CHECK constraint que aceita apenas
-- ('pendente','justificada','abonada','injustificada','em_analise','rejeitada').
-- Logo qualquer INSERT novo com DEFAULT e qualquer row legada com 'ativo'
-- viola o constraint. Corrigir antes de instâncias de produção acumularem
-- mais rows inválidas.

-- 1. Migrar valores legados 'ativo' para o valor semântico equivalente
UPDATE public.faltas
  SET status = 'pendente'
  WHERE status = 'ativo';

-- 2. Trocar o DEFAULT para o valor correto
ALTER TABLE public.faltas
  ALTER COLUMN status SET DEFAULT 'pendente';
