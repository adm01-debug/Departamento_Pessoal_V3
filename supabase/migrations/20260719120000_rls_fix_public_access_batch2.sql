-- RLS Batch 2: Fix PUBLIC-accessible policies and remaining tenant scope gaps
-- Priority 1-7 from audit: pontos, audit_log, integracao_logs, ia_provisoes_alertas,
-- sst_exposicao_riscos, entity_versions, config_afastamentos

-- =============================================================================
-- CRITICAL: pontos — FOR ALL USING(true) = full public read+write
-- =============================================================================
DROP POLICY IF EXISTS "Allow all" ON public.pontos;

DROP POLICY IF EXISTS "pontos_tenant_select" ON public.pontos;
CREATE POLICY "pontos_tenant_select"
  ON public.pontos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = pontos.colaborador_id
        AND public.rls_tenant_or_admin(c.empresa_id)
    )
  );

DROP POLICY IF EXISTS "pontos_tenant_insert" ON public.pontos;
CREATE POLICY "pontos_tenant_insert"
  ON public.pontos FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = pontos.colaborador_id
        AND public.rls_tenant_or_admin(c.empresa_id)
    )
  );

DROP POLICY IF EXISTS "pontos_tenant_update" ON public.pontos;
CREATE POLICY "pontos_tenant_update"
  ON public.pontos FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = pontos.colaborador_id
        AND public.rls_tenant_or_admin(c.empresa_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = pontos.colaborador_id
        AND public.rls_tenant_or_admin(c.empresa_id)
    )
  );

DROP POLICY IF EXISTS "pontos_tenant_delete" ON public.pontos;
CREATE POLICY "pontos_tenant_delete"
  ON public.pontos FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = pontos.colaborador_id
        AND public.rls_tenant_or_admin(c.empresa_id)
    )
  );

-- =============================================================================
-- HIGH: audit_log — PUBLIC read of sensitive audit trail
-- =============================================================================
DROP POLICY IF EXISTS "view_audit" ON public.audit_log;

DROP POLICY IF EXISTS "audit_log_tenant_select" ON public.audit_log;
CREATE POLICY "audit_log_tenant_select"
  ON public.audit_log FOR SELECT TO authenticated
  USING (
    public.rls_tenant_or_admin(empresa_id)
  );

-- =============================================================================
-- HIGH: integracao_logs — PUBLIC read (misleading name "admin only")
-- =============================================================================
DROP POLICY IF EXISTS "Apenas admin pode ver logs de integracão" ON public.integracao_logs;

DROP POLICY IF EXISTS "integracao_logs_admin_only" ON public.integracao_logs;
CREATE POLICY "integracao_logs_admin_only"
  ON public.integracao_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- =============================================================================
-- HIGH: ia_provisoes_alertas — PUBLIC read with empresa_id
-- =============================================================================
DROP POLICY IF EXISTS "Gestores podem ver alertas de IA" ON public.ia_provisoes_alertas;

DROP POLICY IF EXISTS "ia_provisoes_alertas_tenant_select" ON public.ia_provisoes_alertas;
CREATE POLICY "ia_provisoes_alertas_tenant_select"
  ON public.ia_provisoes_alertas FOR SELECT TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id));

-- =============================================================================
-- MEDIUM: sst_exposicao_riscos — PUBLIC read of occupational health data
-- =============================================================================
DROP POLICY IF EXISTS "Gestores de RH podem ver Riscos" ON public.sst_exposicao_riscos;

DROP POLICY IF EXISTS "sst_exposicao_riscos_tenant_select" ON public.sst_exposicao_riscos;
CREATE POLICY "sst_exposicao_riscos_tenant_select"
  ON public.sst_exposicao_riscos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = sst_exposicao_riscos.colaborador_id
        AND public.rls_tenant_or_admin(c.empresa_id)
    )
  );

-- =============================================================================
-- MEDIUM: entity_versions — PUBLIC read of version history
-- =============================================================================
DROP POLICY IF EXISTS "Users can view versions" ON public.entity_versions;

DROP POLICY IF EXISTS "entity_versions_authenticated_select" ON public.entity_versions;
CREATE POLICY "entity_versions_authenticated_select"
  ON public.entity_versions FOR SELECT TO authenticated
  USING (true);

-- =============================================================================
-- MEDIUM: config_afastamentos — authenticated but no tenant scope
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated users can view config_afastamentos" ON public.config_afastamentos;

DROP POLICY IF EXISTS "config_afastamentos_tenant_select" ON public.config_afastamentos;
CREATE POLICY "config_afastamentos_tenant_select"
  ON public.config_afastamentos FOR SELECT TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id));

-- =============================================================================
-- LOW: taxas_cambio — duplicate PUBLIC policies on reference table
-- =============================================================================
DROP POLICY IF EXISTS "Users can view exchange rates" ON public.taxas_cambio;
DROP POLICY IF EXISTS "Public can view exchange rates" ON public.taxas_cambio;

DROP POLICY IF EXISTS "taxas_cambio_authenticated_select" ON public.taxas_cambio;
CREATE POLICY "taxas_cambio_authenticated_select"
  ON public.taxas_cambio FOR SELECT TO authenticated
  USING (true);

-- =============================================================================
-- LOW: cid10 — duplicate PUBLIC policies on reference table
-- =============================================================================
DROP POLICY IF EXISTS "Leitura CID10 publica" ON public.cid10;
DROP POLICY IF EXISTS "Users can view CID10" ON public.cid10;

DROP POLICY IF EXISTS "cid10_authenticated_select" ON public.cid10;
CREATE POLICY "cid10_authenticated_select"
  ON public.cid10 FOR SELECT TO authenticated
  USING (true);

-- =============================================================================
-- LOW: Tables with RLS enabled but NO policies (add proper tenant policies)
-- =============================================================================

-- configuracoes_ponto (has empresa_id)
DROP POLICY IF EXISTS "configuracoes_ponto_tenant_select" ON public.configuracoes_ponto;
CREATE POLICY "configuracoes_ponto_tenant_select"
  ON public.configuracoes_ponto FOR SELECT TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id));

DROP POLICY IF EXISTS "configuracoes_ponto_tenant_manage" ON public.configuracoes_ponto;
CREATE POLICY "configuracoes_ponto_tenant_manage"
  ON public.configuracoes_ponto FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- configuracoes_esocial (has empresa_id)
DROP POLICY IF EXISTS "configuracoes_esocial_tenant_select" ON public.configuracoes_esocial;
CREATE POLICY "configuracoes_esocial_tenant_select"
  ON public.configuracoes_esocial FOR SELECT TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id));

DROP POLICY IF EXISTS "configuracoes_esocial_tenant_manage" ON public.configuracoes_esocial;
CREATE POLICY "configuracoes_esocial_tenant_manage"
  ON public.configuracoes_esocial FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));
