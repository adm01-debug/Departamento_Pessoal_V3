-- Cria tabela ciencia_rate_limits ausente dos migrations anteriores.
--
-- Problema: a tabela é referenciada como já existente em:
--   - 20260723152450_* (função contrato_verificar_autenticidade)
--   - 20260723152556_* (função contrato_verificar_autenticidade_v2 + índice DDL-time)
-- mas nunca foi criada por nenhum migration anterior → SQLSTATE 42P01.
--
-- 20260723180000_fix_bugs_bot_migs_b1_b2_b3_b7.sql confirma que a coluna
-- correta é `identifier` (não `identificador` — Bug B3 naquele batch).
CREATE TABLE IF NOT EXISTS public.ciencia_rate_limits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL,
  rpc_name    TEXT,
  ip_address  INET,
  success     BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ciencia_rate_limits_identifier
  ON public.ciencia_rate_limits (identifier, created_at DESC);
