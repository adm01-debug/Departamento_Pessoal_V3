-- ============================================================
-- HARDENING RLS: remoção de políticas permissivas USING(true)
-- e revogação de leitura anônima em tabelas sensíveis
-- ============================================================

-- 1) audit_log ------------------------------------------------
DROP POLICY IF EXISTS "view_audit" ON public.audit_log;
DROP POLICY IF EXISTS "Admins podem ver todo audit_log" ON public.audit_log;
CREATE POLICY "Admins podem ver todo audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 2) cnab_configuracoes --------------------------------------
DROP POLICY IF EXISTS "Usuários podem ver configurações de suas empresas" ON public.cnab_configuracoes;

-- 3) pendencias ----------------------------------------------
DROP POLICY IF EXISTS "view_pendencias" ON public.pendencias;

-- 4) integracao_logs (payloads de integração = somente admin) --
DROP POLICY IF EXISTS "Apenas admin pode ver logs de integração" ON public.integracao_logs;
CREATE POLICY "Apenas admin pode ver logs de integracao"
  ON public.integracao_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 5) ia_provisoes_alertas (tem empresa_id) --------------------
DROP POLICY IF EXISTS "Gestores podem ver alertas de IA" ON public.ia_provisoes_alertas;
CREATE POLICY "Alertas de IA por empresa"
  ON public.ia_provisoes_alertas FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- 6) provisao_logs (política tenant já existe) ----------------
DROP POLICY IF EXISTS "Gestores podem ver logs de provisão" ON public.provisao_logs;

-- 7) provisao_auditoria (sem empresa_id -> perfis internos) ---
DROP POLICY IF EXISTS "Gestores podem ver auditoria de provisão" ON public.provisao_auditoria;
CREATE POLICY "Auditoria de provisao para perfis internos"
  ON public.provisao_auditoria FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'rh'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
  );

-- 8) sst_exposicao_riscos (scoping via colaborador) -----------
DROP POLICY IF EXISTS "Gestores de RH podem ver Riscos" ON public.sst_exposicao_riscos;
CREATE POLICY "Riscos ocupacionais por empresa"
  ON public.sst_exposicao_riscos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = sst_exposicao_riscos.colaborador_id
        AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
    )
  );

-- 9) historico_rescisoes (PII + salários) ---------------------
DROP POLICY IF EXISTS "Usuarios autenticados podem ver rescisoes" ON public.historico_rescisoes;
CREATE POLICY "Rescisoes por empresa"
  ON public.historico_rescisoes FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- 10) notificacoes_admissao (política tenant já existe) -------
DROP POLICY IF EXISTS "RH pode ver notificacoes" ON public.notificacoes_admissao;

-- 11) permissao_perfis ----------------------------------------
DROP POLICY IF EXISTS "Users can view profiles" ON public.permissao_perfis;
CREATE POLICY "Perfis de permissao por empresa"
  ON public.permissao_perfis FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- 12) políticas com erro lógico (empresa_id = auth.uid()) ------
DROP POLICY IF EXISTS "Multi-tenant access" ON public.candidatos;
DROP POLICY IF EXISTS "Multi-tenant access" ON public.candidaturas;
DROP POLICY IF EXISTS "Multi-tenant access for auditoria_logs" ON public.auditoria_logs;

-- 13) tabelas de apoio abertas ao público ---------------------
DROP POLICY IF EXISTS "Enable read access for all users" ON public.promo_brindes;
CREATE POLICY "Brindes visiveis para autenticados"
  ON public.promo_brindes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read for all" ON public.times_brindes;
CREATE POLICY "Times brindes visiveis para autenticados"
  ON public.times_brindes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON public.times;
CREATE POLICY "Times por empresa"
  ON public.times FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- 14) revogação de leitura anônima -----------------------------
REVOKE SELECT ON
  public.audit_log,
  public.auditoria_logs,
  public.candidatos,
  public.candidaturas,
  public.cnab_configuracoes,
  public.config_alertas_indicadores,
  public.historico_rescisoes,
  public.ia_provisoes_alertas,
  public.integracao_logs,
  public.notificacoes_admissao,
  public.pendencias,
  public.periodos_ponto,
  public.permissao_perfis,
  public.promo_brindes,
  public.provisao_auditoria,
  public.provisao_logs,
  public.sst_exposicao_riscos,
  public.times,
  public.times_brindes
FROM anon;