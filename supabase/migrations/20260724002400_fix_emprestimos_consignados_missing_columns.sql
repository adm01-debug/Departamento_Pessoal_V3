-- Issue 52: Adiciona colunas de negócio ausentes em emprestimos_consignados.
--
-- O stub 2025122813134111_create_emprestimos_consignados.sql criou a tabela
-- com schema genérico (empresa_id, colaborador_id, descricao, valor, data_inicio,
-- data_fim, status VARCHAR(50)).
--
-- A proper migration 20251228131626 foi NO-OP (CREATE TABLE IF NOT EXISTS).
-- A migration 20260520120947 também foi NO-OP pelo mesmo motivo.
--
-- O app (NewLoanDialog.tsx + DescontosPage.tsx) insere:
--   { colaborador_id, empresa_id, instituicao_financeira, valor_total,
--     numero_parcelas, valor_parcela, data_inicio, status }
-- EmprestimosTable exibe e.valor_parcela (componente descontos/EmprestimosTable.tsx).
-- types.ts exige valor_total, valor_parcela e numero_parcelas como NOT NULL.
--
-- Estratégia de backfill segura:
--   valor_total  → COALESCE(valor existente, 0)
--   numero_parcelas → DEFAULT 1 (valor mínimo razoável)
--   valor_parcela   → COALESCE(valor existente, 0) / 1 = valor_total
--   parcelas_pagas, taxa_juros, instituicao_financeira → nullable, sem backfill

-- ── Adiciona colunas ausentes ────────────────────────────────────────────────
ALTER TABLE public.emprestimos_consignados
  ADD COLUMN IF NOT EXISTS instituicao_financeira TEXT,
  ADD COLUMN IF NOT EXISTS valor_total            NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS numero_parcelas        INTEGER,
  ADD COLUMN IF NOT EXISTS valor_parcela          NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS parcelas_pagas         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_juros             NUMERIC(5,2);

-- ── Backfill + NOT NULL nas colunas obrigatórias ─────────────────────────────
DO $$
BEGIN
  -- Backfill valor_total a partir de valor (coluna legada do stub)
  UPDATE public.emprestimos_consignados
    SET valor_total = COALESCE(valor, 0)
    WHERE valor_total IS NULL;

  -- Backfill numero_parcelas com 1 (parcela única para dados legados sem contexto)
  UPDATE public.emprestimos_consignados
    SET numero_parcelas = 1
    WHERE numero_parcelas IS NULL;

  -- Backfill valor_parcela = valor_total / numero_parcelas
  UPDATE public.emprestimos_consignados
    SET valor_parcela = ROUND(COALESCE(valor_total, 0) / GREATEST(numero_parcelas, 1), 2)
    WHERE valor_parcela IS NULL;

  -- Promove valor_total para NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'emprestimos_consignados'
      AND column_name  = 'valor_total'
      AND is_nullable  = 'YES'
  ) THEN
    ALTER TABLE public.emprestimos_consignados ALTER COLUMN valor_total SET NOT NULL;
    ALTER TABLE public.emprestimos_consignados ALTER COLUMN numero_parcelas SET NOT NULL;
    ALTER TABLE public.emprestimos_consignados ALTER COLUMN valor_parcela SET NOT NULL;
  END IF;
END $$;

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_emprestimos_empresa_status
  ON public.emprestimos_consignados (empresa_id, status);

CREATE INDEX IF NOT EXISTS idx_emprestimos_colaborador_status
  ON public.emprestimos_consignados (colaborador_id, status);
