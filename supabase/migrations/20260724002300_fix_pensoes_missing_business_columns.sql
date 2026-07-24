-- Issue 51: Adiciona colunas de negócio ausentes em pensoes.
--
-- O stub 2025122813134010_create_pensoes.sql criou a tabela com schema genérico
-- (empresa_id, colaborador_id, descricao, valor, data_inicio, data_fim, status).
-- A proper migration 20251228131625 e a redesign 20260306005302 foram NO-OPs
-- (CREATE TABLE IF NOT EXISTS — tabela já existia pelo stub).
--
-- O app (PensoesPage.tsx linha 43-46) insere:
--   { colaborador_id, beneficiario, cpf_beneficiario, tipo, percentual,
--     valor_fixo, banco, agencia, conta }
-- Nenhuma dessas colunas (exceto colaborador_id) existe na tabela real.
-- types.ts exige beneficiario: string (NOT NULL).
--
-- A migration 20260719100000 já garante RLS via empresa_id com
-- rls_tenant_or_admin(empresa_id), portanto empresa_id permanece na tabela.
-- Issue 46 (20260724001800) já adicionou ativo BOOLEAN.

ALTER TABLE public.pensoes
  ADD COLUMN IF NOT EXISTS beneficiario    TEXT,
  ADD COLUMN IF NOT EXISTS cpf_beneficiario TEXT,
  ADD COLUMN IF NOT EXISTS tipo            TEXT,
  ADD COLUMN IF NOT EXISTS percentual      NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS valor_fixo      NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS banco           TEXT,
  ADD COLUMN IF NOT EXISTS agencia         TEXT,
  ADD COLUMN IF NOT EXISTS conta           TEXT;

-- ── Backfill + NOT NULL em beneficiario ──────────────────────────────────────
DO $$
BEGIN
  -- Backfill: registros sem beneficiario recebem placeholder derivado do UUID
  UPDATE public.pensoes
    SET beneficiario = 'Beneficiário ' || LEFT(id::text, 8)
    WHERE beneficiario IS NULL;

  -- Promove para NOT NULL apenas se ainda nullable (idempotente)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'pensoes'
      AND column_name  = 'beneficiario'
      AND is_nullable  = 'YES'
  ) THEN
    ALTER TABLE public.pensoes ALTER COLUMN beneficiario SET NOT NULL;
  END IF;
END $$;

-- ── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pensoes_colaborador_ativo
  ON public.pensoes (colaborador_id, ativo)
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_pensoes_tipo
  ON public.pensoes (tipo)
  WHERE tipo IS NOT NULL;
