-- Issue 56: Adiciona colunas de negócio ausentes em guias_fgts e guias_inss.
--
-- Os stubs 2025122813135816_create_guias_fgts.sql e
-- 2025122813135715_create_guias_inss.sql criaram as tabelas com schema genérico
-- (numero, descricao, valor, data_emissao, data_vencimento, status).
-- A proper migration 20260306005329 foi NO-OP (CREATE TABLE IF NOT EXISTS).
--
-- O app (ObrigacoesFiscaisPage.tsx) usa:
--   linha 50: SELECT * ORDER BY competencia          → falha (coluna não existe)
--   linha 51: SELECT * ORDER BY competencia          → falha (coluna não existe)
--   linha 60: INSERT { competencia, valor, ... }     → falha (coluna não existe)
--   linha 69: UPDATE SET status='paga', data_pagamento=... → falha (coluna não existe)
--
-- Políticas RLS acumuladas (todas inseguras):
--   "guias_fgts_all"            USING (auth.uid() IS NOT NULL)  [stub]
--   "Auth users manage guias_fgts"  USING (true)               [20260306005329]
--   "guias_inss_all"            USING (auth.uid() IS NOT NULL)  [stub]
--   "Auth users manage guias_inss"  USING (true)               [20260306005329]
-- → nenhuma garante isolamento tenant real.

-- ── guias_fgts: adiciona colunas ausentes ────────────────────────────────────
ALTER TABLE public.guias_fgts
  ADD COLUMN IF NOT EXISTS competencia          TEXT,
  ADD COLUMN IF NOT EXISTS tipo                 TEXT DEFAULT 'mensal',
  ADD COLUMN IF NOT EXISTS valor_total          NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_multa          NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_total_recolher NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_pagamento       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS codigo_barras        TEXT;

-- ── guias_inss: adiciona colunas ausentes ────────────────────────────────────
ALTER TABLE public.guias_inss
  ADD COLUMN IF NOT EXISTS competencia          TEXT,
  ADD COLUMN IF NOT EXISTS tipo                 TEXT DEFAULT 'mensal',
  ADD COLUMN IF NOT EXISTS valor_empresa        NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_segurados      NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_total          NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_pagamento       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS codigo_barras        TEXT;

-- ── Backfill + NOT NULL em competencia (ambas as tabelas) ────────────────────
DO $$
BEGIN
  -- guias_fgts: competencia ← data_emissao formatada como YYYY-MM ou UUID fallback
  UPDATE public.guias_fgts
    SET competencia = TO_CHAR(data_emissao, 'YYYY-MM')
    WHERE competencia IS NULL AND data_emissao IS NOT NULL;

  UPDATE public.guias_fgts
    SET competencia = TO_CHAR(created_at, 'YYYY-MM')
    WHERE competencia IS NULL AND created_at IS NOT NULL;

  UPDATE public.guias_fgts
    SET competencia = TO_CHAR(NOW(), 'YYYY-MM')
    WHERE competencia IS NULL;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'guias_fgts'
      AND column_name  = 'competencia'
      AND is_nullable  = 'YES'
  ) THEN
    ALTER TABLE public.guias_fgts ALTER COLUMN competencia SET NOT NULL;
  END IF;

  -- guias_inss: mesmo backfill
  UPDATE public.guias_inss
    SET competencia = TO_CHAR(data_emissao, 'YYYY-MM')
    WHERE competencia IS NULL AND data_emissao IS NOT NULL;

  UPDATE public.guias_inss
    SET competencia = TO_CHAR(created_at, 'YYYY-MM')
    WHERE competencia IS NULL AND created_at IS NOT NULL;

  UPDATE public.guias_inss
    SET competencia = TO_CHAR(NOW(), 'YYYY-MM')
    WHERE competencia IS NULL;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'guias_inss'
      AND column_name  = 'competencia'
      AND is_nullable  = 'YES'
  ) THEN
    ALTER TABLE public.guias_inss ALTER COLUMN competencia SET NOT NULL;
  END IF;
END $$;

-- ── Consolida RLS — substitui políticas cross-tenant por isolamento real ──────
ALTER TABLE public.guias_fgts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guias_inss ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guias_fgts_all"               ON public.guias_fgts;
DROP POLICY IF EXISTS "Auth users manage guias_fgts"  ON public.guias_fgts;
DROP POLICY IF EXISTS "guias_fgts_tenant"             ON public.guias_fgts;

DROP POLICY IF EXISTS "guias_inss_all"               ON public.guias_inss;
DROP POLICY IF EXISTS "Auth users manage guias_inss"  ON public.guias_inss;
DROP POLICY IF EXISTS "guias_inss_tenant"             ON public.guias_inss;

CREATE POLICY "guias_fgts_tenant"
  ON public.guias_fgts
  FOR ALL
  TO authenticated
  USING  (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

CREATE POLICY "guias_inss_tenant"
  ON public.guias_inss
  FOR ALL
  TO authenticated
  USING  (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_guias_fgts_empresa_competencia
  ON public.guias_fgts (empresa_id, competencia);

CREATE INDEX IF NOT EXISTS idx_guias_fgts_status
  ON public.guias_fgts (empresa_id, status)
  WHERE status != 'paga';

CREATE INDEX IF NOT EXISTS idx_guias_inss_empresa_competencia
  ON public.guias_inss (empresa_id, competencia);

CREATE INDEX IF NOT EXISTS idx_guias_inss_status
  ON public.guias_inss (empresa_id, status)
  WHERE status != 'paga';
