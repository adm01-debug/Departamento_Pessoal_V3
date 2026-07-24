-- Garante colunas financeiras em ferias que 20251216170845_* tentou criar
-- via CREATE TABLE IF NOT EXISTS (no-op: 003_folha_ferias_ponto.sql rodou antes).
--
-- Colunas ausentes causam falha em:
--   - VIEW v_ferias_folha_reconciliacao (20260723121733): valor_terco, valor_terco_abono,
--     descontos_inss, descontos_irrf → SQLSTATE 42703 em DDL-time.
--   - Triggers enforce_ferias_hash / impedir_alteracao_ferias_concluidas (20260712212325):
--     valor_total, valor_liquido → PL/pgSQL runtime.
ALTER TABLE public.ferias
  ADD COLUMN IF NOT EXISTS vender_abono        BOOLEAN         DEFAULT false,
  ADD COLUMN IF NOT EXISTS salario_base        NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS valor_terco         NUMERIC(12,2)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_terco_abono   NUMERIC(12,2)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_total         NUMERIC(12,2)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descontos_inss      NUMERIC(12,2)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descontos_irrf      NUMERIC(12,2)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_liquido       NUMERIC(12,2)   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by          UUID;
