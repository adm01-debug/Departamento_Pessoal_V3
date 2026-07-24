-- Issue 50: Adiciona colunas de negócio ausentes em treinamentos.
--
-- O stub 2025122813140325_create_treinamentos.sql criou a tabela com um schema
-- de "documento financeiro" (numero, descricao, valor, data_emissao, data_vencimento)
-- em vez do schema de "treinamento" usado pelo app:
--   - TreinamentosPage.tsx (linha 34): INSERT envia { nome, descricao, data, carga_horaria }
--   - PortalPage.tsx (linha 37): SELECT 'id, nome, status, data_inicio'
--   - types.ts: espera { nome: string, descricao, data, carga_horaria, empresa_id }
--
-- O stub 20260306004534 tentou recriar a tabela com o schema correto via
-- CREATE TABLE IF NOT EXISTS — foi NO-OP porque o stub já existia.
--
-- Consequência: qualquer INSERT ou SELECT de nome/data/carga_horaria/data_inicio
-- falha com "column does not exist".

-- ── Adiciona colunas ausentes ──────────────────────────────────────────────────
ALTER TABLE public.treinamentos
  ADD COLUMN IF NOT EXISTS nome         TEXT,
  ADD COLUMN IF NOT EXISTS data         TEXT,
  ADD COLUMN IF NOT EXISTS carga_horaria NUMERIC,
  ADD COLUMN IF NOT EXISTS data_inicio  DATE;

-- ── Backfill + NOT NULL em nome ────────────────────────────────────────────────
DO $$
BEGIN
  -- Backfill: rows sem nome recebem valor derivado de descricao ou UUID
  UPDATE public.treinamentos
    SET nome = COALESCE(
      NULLIF(TRIM(descricao), ''),
      'Treinamento ' || LEFT(id::text, 8)
    )
    WHERE nome IS NULL;

  -- Promove para NOT NULL somente se ainda nullable (idempotente)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'treinamentos'
      AND column_name  = 'nome'
      AND is_nullable  = 'YES'
  ) THEN
    ALTER TABLE public.treinamentos ALTER COLUMN nome SET NOT NULL;
  END IF;
END $$;

-- ── Índices para os novos campos ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_treinamentos_nome_empresa
  ON public.treinamentos (empresa_id, nome);

CREATE INDEX IF NOT EXISTS idx_treinamentos_status_inicio
  ON public.treinamentos (status, data_inicio)
  WHERE data_inicio IS NOT NULL;
