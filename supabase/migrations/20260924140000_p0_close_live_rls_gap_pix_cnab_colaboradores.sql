-- P0: close RLS gaps confirmed active in production by audit-rls-pii and by
-- the 24/09/2026 delta audit (AUDITORIA.md A-035, A-036).
--
-- Two independent failure classes are fixed here, on the tables where they
-- were found:
--   1. Forgeable-claim policies (empresa_id compared to a JWT claim instead
--      of to persisted membership): colaboradores, dependentes, ferias,
--      provisoes_folha.
--   2. Zero-correlation policies ("any empresa_id that exists anywhere" /
--      "any lote/remessa that exists anywhere"): pix_lotes, pix_itens,
--      cnab_remessas, cnab_itens. These were not part of the original
--      audit-rls-pii scope but share the exact same root cause and were
--      found while tracing pix_lotes during this remediation.
--
-- All DROP POLICY targets below were read directly from pg_policies on the
-- live canonical database immediately before writing this migration, not
-- copied from the historical (never-applied) 19-31/07/2026 batch. Several
-- of that batch's DROP POLICY statements silently no-op because they target
-- policy names that do not match what is actually live (AUDITORIA.md
-- A-036) — this migration avoids that failure mode by construction.

DO $preflight$
BEGIN
  IF to_regprocedure('public.pode_gerir_rh(uuid)') IS NULL
     OR to_regprocedure('public.pode_gerir_pessoas(uuid)') IS NULL
     OR to_regprocedure('public.pertence_a_empresa(uuid)') IS NULL
     OR to_regprocedure('public.get_user_empresas(uuid)') IS NULL
     OR to_regprocedure('public.is_admin(uuid)') IS NULL THEN
    RAISE EXCEPTION 'P0 RLS remediation requires pode_gerir_rh, pode_gerir_pessoas, pertence_a_empresa, get_user_empresas and is_admin';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ferias' AND column_name = 'empresa_id'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cnab_remessas' AND column_name = 'empresa_id'
  ) THEN
    RAISE EXCEPTION 'P0 RLS remediation requires ferias.empresa_id and cnab_remessas.empresa_id';
  END IF;
END
$preflight$;

-- ============================================================
-- colaboradores
-- ============================================================
DROP POLICY IF EXISTS "Admins manage employees in their empresas" ON public.colaboradores;
DROP POLICY IF EXISTS "Usuários podem ver colaboradores da sua empresa" ON public.colaboradores;
DROP POLICY IF EXISTS "Usuários podem atualizar colaboradores da sua empresa" ON public.colaboradores;
DROP POLICY IF EXISTS "Usuários podem deletar colaboradores da sua empresa" ON public.colaboradores;
DROP POLICY IF EXISTS "Usuários podem inserir colaboradores na sua empresa" ON public.colaboradores;
DROP POLICY IF EXISTS "empresa_isolation_colaboradores" ON public.colaboradores;

CREATE POLICY "colaboradores_rh_manage" ON public.colaboradores
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY "colaboradores_tenant_read" ON public.colaboradores
  FOR SELECT TO authenticated
  USING (public.pertence_a_empresa(empresa_id));

-- ============================================================
-- dependentes (tenant derivado do colaborador; sem empresa_id direto)
-- ============================================================
DROP POLICY IF EXISTS "empresa_isolation_dependentes" ON public.dependentes;
DROP POLICY IF EXISTS "tenant_dependentes" ON public.dependentes;

CREATE POLICY "dependentes_rh_manage" ON public.dependentes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = dependentes.colaborador_id AND public.pode_gerir_rh(c.empresa_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = dependentes.colaborador_id AND public.pode_gerir_rh(c.empresa_id)
    )
  );

CREATE POLICY "dependentes_tenant_read" ON public.dependentes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = dependentes.colaborador_id AND public.pertence_a_empresa(c.empresa_id)
    )
  );

-- ============================================================
-- ferias
-- ============================================================
DROP POLICY IF EXISTS "empresa_isolation_ferias" ON public.ferias;
DROP POLICY IF EXISTS "tenant_ferias" ON public.ferias;

CREATE POLICY "ferias_rh_manage" ON public.ferias
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY "ferias_gestor_read" ON public.ferias
  FOR SELECT TO authenticated
  USING (public.pode_gerir_pessoas(empresa_id));

-- ============================================================
-- provisoes_folha
-- ============================================================
DROP POLICY IF EXISTS "Visualização por empresa provisoes" ON public.provisoes_folha;

CREATE POLICY "provisoes_folha_rh_read" ON public.provisoes_folha
  FOR SELECT TO authenticated
  USING (public.pode_gerir_rh(empresa_id));

-- ============================================================
-- pix_lotes (tinha "empresa_id IN (SELECT id FROM empresas)" -- qualquer
-- empresa_id existente, sem checar o chamador)
-- ============================================================
DROP POLICY IF EXISTS "Empresas can view their own PIX lotes" ON public.pix_lotes;
DROP POLICY IF EXISTS "Empresas can insert their own PIX lotes" ON public.pix_lotes;

CREATE POLICY "pix_lotes_rh_manage" ON public.pix_lotes
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY "pix_lotes_tenant_read" ON public.pix_lotes
  FOR SELECT TO authenticated
  USING (public.pertence_a_empresa(empresa_id));

-- ============================================================
-- pix_itens (tinha "lote_id IN (SELECT id FROM pix_lotes)" -- qualquer
-- lote existente, zero correlacao de tenant)
-- ============================================================
DROP POLICY IF EXISTS "Empresas can view their own PIX itens" ON public.pix_itens;
DROP POLICY IF EXISTS "Empresas can insert their own PIX itens" ON public.pix_itens;

CREATE POLICY "pix_itens_rh_manage" ON public.pix_itens
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pix_lotes l
      WHERE l.id = pix_itens.lote_id AND public.pode_gerir_rh(l.empresa_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pix_lotes l
      WHERE l.id = pix_itens.lote_id AND public.pode_gerir_rh(l.empresa_id)
    )
  );

CREATE POLICY "pix_itens_tenant_read" ON public.pix_itens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pix_lotes l
      WHERE l.id = pix_itens.lote_id AND public.pertence_a_empresa(l.empresa_id)
    )
  );

-- ============================================================
-- cnab_remessas (mesmo padrao aberto do pix_lotes; nao fazia parte do
-- escopo original do gate audit-rls-pii, achado ao rastrear pix_lotes)
-- ============================================================
DROP POLICY IF EXISTS "Empresas can view their own CNAB remessas" ON public.cnab_remessas;
DROP POLICY IF EXISTS "Empresas can insert their own CNAB remessas" ON public.cnab_remessas;
DROP POLICY IF EXISTS "Users can insert their company remessas" ON public.cnab_remessas;
DROP POLICY IF EXISTS "Users can see their company remessas" ON public.cnab_remessas;

CREATE POLICY "cnab_remessas_rh_manage" ON public.cnab_remessas
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY "cnab_remessas_tenant_read" ON public.cnab_remessas
  FOR SELECT TO authenticated
  USING (public.pertence_a_empresa(empresa_id));

-- ============================================================
-- cnab_itens (contem dados bancarios do favorecido; mesmo padrao aberto)
-- ============================================================
DROP POLICY IF EXISTS "Empresas can view their own CNAB itens" ON public.cnab_itens;
DROP POLICY IF EXISTS "Empresas can insert their own CNAB itens" ON public.cnab_itens;
DROP POLICY IF EXISTS "Users can see their company cnab items" ON public.cnab_itens;

CREATE POLICY "cnab_itens_rh_manage" ON public.cnab_itens
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cnab_remessas r
      WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cnab_remessas r
      WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id)
    )
  );

CREATE POLICY "cnab_itens_tenant_read" ON public.cnab_itens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cnab_remessas r
      WHERE r.id = cnab_itens.remessa_id AND public.pertence_a_empresa(r.empresa_id)
    )
  );
