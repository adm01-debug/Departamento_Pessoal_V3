-- Issue 49: Substitui políticas RLS cross-tenant em 10 tabelas restantes.
--
-- Tabelas afetadas (todas criadas por stubs com USING (auth.uid() IS NOT NULL)):
--   emprestimos_consignados, recibos_ferias, recibos_rescisao, darfs,
--   grrf, trct, homologacoes, exames_medicos, cas, avaliacoes
--
-- Estado antes desta migration:
--   emprestimos_consignados: 4 policies separadas (select/insert/update/delete)
--   recibos_ferias:          4 policies separadas (select/insert/update/delete)
--   recibos_rescisao:        1 policy FOR ALL "recibos_rescisao_all"
--   darfs:                   1 policy FOR ALL "darfs_all"
--   grrf:                    1 policy FOR ALL "grrf_all"
--   trct:                    1 policy FOR ALL "trct_all"
--   homologacoes:            1 policy FOR ALL "homologacoes_all"
--   exames_medicos:          1 policy FOR ALL "exames_medicos_all"
--   cas:                     1 policy FOR ALL "cas_all" (presente em AMBOS stub e proper)
--   avaliacoes:              1 policy FOR ALL "avaliacoes_all"
--
-- Nenhuma migration de 2026 corrigiu qualquer uma dessas tabelas.
-- Todas têm empresa_id direto → usar get_auth_empresa_id() diretamente.

-- ── emprestimos_consignados ───────────────────────────────────────────────────
ALTER TABLE public.emprestimos_consignados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emprestimos_consignados_select" ON public.emprestimos_consignados;
DROP POLICY IF EXISTS "emprestimos_consignados_insert" ON public.emprestimos_consignados;
DROP POLICY IF EXISTS "emprestimos_consignados_update" ON public.emprestimos_consignados;
DROP POLICY IF EXISTS "emprestimos_consignados_delete" ON public.emprestimos_consignados;
DROP POLICY IF EXISTS "emprestimos_consignados_tenant" ON public.emprestimos_consignados;

CREATE POLICY "emprestimos_consignados_tenant"
  ON public.emprestimos_consignados
  FOR ALL
  TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- ── recibos_ferias ────────────────────────────────────────────────────────────
ALTER TABLE public.recibos_ferias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recibos_ferias_select" ON public.recibos_ferias;
DROP POLICY IF EXISTS "recibos_ferias_insert" ON public.recibos_ferias;
DROP POLICY IF EXISTS "recibos_ferias_update" ON public.recibos_ferias;
DROP POLICY IF EXISTS "recibos_ferias_delete" ON public.recibos_ferias;
DROP POLICY IF EXISTS "recibos_ferias_tenant"  ON public.recibos_ferias;

CREATE POLICY "recibos_ferias_tenant"
  ON public.recibos_ferias
  FOR ALL
  TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- ── recibos_rescisao ──────────────────────────────────────────────────────────
ALTER TABLE public.recibos_rescisao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recibos_rescisao_all"    ON public.recibos_rescisao;
DROP POLICY IF EXISTS "recibos_rescisao_tenant" ON public.recibos_rescisao;

CREATE POLICY "recibos_rescisao_tenant"
  ON public.recibos_rescisao
  FOR ALL
  TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- ── darfs ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.darfs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "darfs_all"    ON public.darfs;
DROP POLICY IF EXISTS "darfs_tenant" ON public.darfs;

CREATE POLICY "darfs_tenant"
  ON public.darfs
  FOR ALL
  TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- ── grrf ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.grrf ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grrf_all"    ON public.grrf;
DROP POLICY IF EXISTS "grrf_tenant" ON public.grrf;

CREATE POLICY "grrf_tenant"
  ON public.grrf
  FOR ALL
  TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- ── trct ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.trct ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trct_all"    ON public.trct;
DROP POLICY IF EXISTS "trct_tenant" ON public.trct;

CREATE POLICY "trct_tenant"
  ON public.trct
  FOR ALL
  TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- ── homologacoes ──────────────────────────────────────────────────────────────
ALTER TABLE public.homologacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "homologacoes_all"    ON public.homologacoes;
DROP POLICY IF EXISTS "homologacoes_tenant" ON public.homologacoes;

CREATE POLICY "homologacoes_tenant"
  ON public.homologacoes
  FOR ALL
  TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- ── exames_medicos ────────────────────────────────────────────────────────────
ALTER TABLE public.exames_medicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exames_medicos_all"    ON public.exames_medicos;
DROP POLICY IF EXISTS "exames_medicos_tenant" ON public.exames_medicos;

CREATE POLICY "exames_medicos_tenant"
  ON public.exames_medicos
  FOR ALL
  TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- ── cas ───────────────────────────────────────────────────────────────────────
-- Ambos stub (2025122813140224) e proper migration (20251228131670) criaram
-- "cas_all" FOR ALL USING (auth.uid() IS NOT NULL). Dropar ambas as variantes.
ALTER TABLE public.cas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cas_all"    ON public.cas;
DROP POLICY IF EXISTS "cas_tenant" ON public.cas;

CREATE POLICY "cas_tenant"
  ON public.cas
  FOR ALL
  TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- ── avaliacoes ────────────────────────────────────────────────────────────────
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avaliacoes_all"    ON public.avaliacoes;
DROP POLICY IF EXISTS "avaliacoes_tenant" ON public.avaliacoes;

CREATE POLICY "avaliacoes_tenant"
  ON public.avaliacoes
  FOR ALL
  TO authenticated
  USING (empresa_id = public.get_auth_empresa_id())
  WITH CHECK (empresa_id = public.get_auth_empresa_id());
