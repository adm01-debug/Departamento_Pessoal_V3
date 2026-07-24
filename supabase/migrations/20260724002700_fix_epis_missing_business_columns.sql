-- Issue 55: Adiciona colunas de negócio ausentes em epis e consolida RLS.
--
-- O stub 2025122813140223_create_epis.sql criou a tabela com schema genérico
-- (numero, descricao, valor, data_emissao, data_vencimento, status).
-- A proper migration 20251228131669 foi NO-OP (CREATE TABLE IF NOT EXISTS).
-- A migration 20260317001900 também foi NO-OP pelo mesmo motivo.
-- Migrações posteriores adicionaram via ALTER TABLE:
--   20260509: ca_validade DATE
--   20260511: fabricante, unidade_medida, estoque_atual, estoque_minimo
-- Mas NUNCA foram adicionadas: nome, ca, categoria, ativo, validade_ca.
--
-- O app usa:
--   episService.ts (linha 5):  SELECT * ORDER BY nome → falha (coluna não existe)
--   episService.ts (linha 42): JOIN epi:epis(nome, ca) → falha (ambas ausentes)
--   SSTPage.tsx / EPIsPage.tsx: SELECT nome, ca, categoria, ativo → falha
--   types.ts: Row exige nome: string (NOT NULL no Insert)
--
-- Histórico de políticas RLS acumuladas (todas inseguras — permitem cross-tenant):
--   "epis_all"                       (stub 2025122813140223 + 20251228131669)
--     USING (auth.uid() IS NOT NULL)
--   "epis_select/insert/update/delete" (20260317001900)
--     USING (empresa_id IN (SELECT get_user_empresas(auth.uid())))
--   "Empresas can manage their own epis" (20260511203845)
--     USING (empresa_id IN (SELECT id FROM empresas))
-- → nenhuma das três garante isolamento tenant real.

-- ── Adiciona colunas ausentes ────────────────────────────────────────────────
ALTER TABLE public.epis
  ADD COLUMN IF NOT EXISTS nome        TEXT,
  ADD COLUMN IF NOT EXISTS ca          TEXT,
  ADD COLUMN IF NOT EXISTS categoria   TEXT,
  ADD COLUMN IF NOT EXISTS ativo       BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS validade_ca DATE;

-- ── Backfill + NOT NULL em nome ───────────────────────────────────────────────
DO $$
BEGIN
  -- Backfill: rows sem nome recebem valor derivado de descricao ou UUID
  UPDATE public.epis
    SET nome = COALESCE(
      NULLIF(TRIM(descricao), ''),
      'EPI ' || LEFT(id::text, 8)
    )
    WHERE nome IS NULL;

  -- Backfill: ativo legado sem flag recebe true (equipamento presume ativo)
  UPDATE public.epis
    SET ativo = true
    WHERE ativo IS NULL;

  -- Promove nome para NOT NULL apenas se ainda nullable (idempotente)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'epis'
      AND column_name  = 'nome'
      AND is_nullable  = 'YES'
  ) THEN
    ALTER TABLE public.epis ALTER COLUMN nome SET NOT NULL;
  END IF;
END $$;

-- ── Consolida RLS — substitui as 3 camadas cross-tenant por política única ────
ALTER TABLE public.epis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "epis_all"                           ON public.epis;
DROP POLICY IF EXISTS "epis_select"                        ON public.epis;
DROP POLICY IF EXISTS "epis_insert"                        ON public.epis;
DROP POLICY IF EXISTS "epis_update"                        ON public.epis;
DROP POLICY IF EXISTS "epis_delete"                        ON public.epis;
DROP POLICY IF EXISTS "Empresas can manage their own epis" ON public.epis;
DROP POLICY IF EXISTS "epis_tenant"                        ON public.epis;

CREATE POLICY "epis_tenant"
  ON public.epis
  FOR ALL
  TO authenticated
  USING  (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_epis_nome_empresa
  ON public.epis (empresa_id, nome);

CREATE INDEX IF NOT EXISTS idx_epis_ativo
  ON public.epis (empresa_id, ativo)
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_epis_ca
  ON public.epis (ca)
  WHERE ca IS NOT NULL;
