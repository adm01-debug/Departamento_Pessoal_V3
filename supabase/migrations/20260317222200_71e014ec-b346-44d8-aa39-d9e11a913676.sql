
-- ============================================================
-- 1. CRITICAL: Fix admissao_tokens - remove public true policies
-- ============================================================
DROP POLICY IF EXISTS "Public can read own token by token value" ON public.admissao_tokens;
DROP POLICY IF EXISTS "Public can update own token by token value" ON public.admissao_tokens;

-- ============================================================
-- 2. CRITICAL: Fix documentos_admissao - remove public true policies
-- ============================================================
DROP POLICY IF EXISTS "Public can view documentos via token" ON public.documentos_admissao;
DROP POLICY IF EXISTS "Public can insert documentos via token" ON public.documentos_admissao;

-- ============================================================
-- 3. CRITICAL: Fix login_rate_limits - remove public write access
-- ============================================================
DROP POLICY IF EXISTS "Public can read rate limits" ON public.login_rate_limits;
DROP POLICY IF EXISTS "Public can update rate limits" ON public.login_rate_limits;
DROP POLICY IF EXISTS "Public can insert rate limits" ON public.login_rate_limits;

-- ============================================================
-- 4. CRITICAL: Fix colaboradores - remove OR empresa_id IS NULL
-- ============================================================
DROP POLICY IF EXISTS "Usuários podem ver colaboradores da sua empresa" ON public.colaboradores;
DROP POLICY IF EXISTS "Usuários podem inserir colaboradores na sua empresa" ON public.colaboradores;
DROP POLICY IF EXISTS "Usuários podem atualizar colaboradores da sua empresa" ON public.colaboradores;
DROP POLICY IF EXISTS "Usuários podem deletar colaboradores da sua empresa" ON public.colaboradores;

CREATE POLICY "Usuários podem ver colaboradores da sua empresa" ON public.colaboradores
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Usuários podem inserir colaboradores na sua empresa" ON public.colaboradores;
CREATE POLICY "Usuários podem inserir colaboradores na sua empresa" ON public.colaboradores
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Usuários podem atualizar colaboradores da sua empresa" ON public.colaboradores;
CREATE POLICY "Usuários podem atualizar colaboradores da sua empresa" ON public.colaboradores
  FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Usuários podem deletar colaboradores da sua empresa" ON public.colaboradores;
CREATE POLICY "Usuários podem deletar colaboradores da sua empresa" ON public.colaboradores
  FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT get_user_empresas(auth.uid())));

-- ============================================================
-- 5. CRITICAL: Fix webauthn_challenges - add per-user isolation
-- ============================================================
DROP POLICY IF EXISTS "auth_webauthn_challenges" ON public.webauthn_challenges;

DROP POLICY IF EXISTS "Users can manage own webauthn challenges" ON public.webauthn_challenges;
CREATE POLICY "Users can manage own webauthn challenges" ON public.webauthn_challenges
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ============================================================
-- 6. CRITICAL: Fix audit_log - add user scoping
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view audit_log" ON public.audit_log;

DROP POLICY IF EXISTS "Users can view own audit_log" ON public.audit_log;
CREATE POLICY "Users can view own audit_log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================================
-- 7. CRITICAL: Fix audit_logs - add user scoping
-- ============================================================
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;

CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================================
-- 8. CRITICAL: Fix auditoria_logs - add user scoping
-- ============================================================
DROP POLICY IF EXISTS "Usuários autenticados podem ver auditoria_logs" ON public.auditoria_logs;

CREATE POLICY "Usuários autenticados podem ver auditoria_logs" ON public.auditoria_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================================
-- 9. WARN: Fix integracoes - restrict to admin only
-- ============================================================
DROP POLICY IF EXISTS "auth_integracoes" ON public.integracoes;

DROP POLICY IF EXISTS "Admins can manage integracoes" ON public.integracoes;
CREATE POLICY "Admins can manage integracoes" ON public.integracoes
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- 10. WARN: Fix configuracoes - restrict writes to admin
-- ============================================================
DROP POLICY IF EXISTS "Usuários autenticados podem ver configuracoes" ON public.configuracoes;
DROP POLICY IF EXISTS "configuracoes_insert" ON public.configuracoes;
DROP POLICY IF EXISTS "configuracoes_update" ON public.configuracoes;

DROP POLICY IF EXISTS "Authenticated can read configuracoes" ON public.configuracoes;
CREATE POLICY "Authenticated can read configuracoes" ON public.configuracoes
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert configuracoes" ON public.configuracoes;
CREATE POLICY "Admins can insert configuracoes" ON public.configuracoes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update configuracoes" ON public.configuracoes;
CREATE POLICY "Admins can update configuracoes" ON public.configuracoes
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- 11. WARN: Fix periodos_ponto - restrict writes to admin
-- ============================================================
DROP POLICY IF EXISTS "auth_periodos_ponto" ON public.periodos_ponto;

DROP POLICY IF EXISTS "Authenticated can read periodos_ponto" ON public.periodos_ponto;
CREATE POLICY "Authenticated can read periodos_ponto" ON public.periodos_ponto
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage periodos_ponto" ON public.periodos_ponto;
CREATE POLICY "Admins can manage periodos_ponto" ON public.periodos_ponto
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update periodos_ponto" ON public.periodos_ponto;
CREATE POLICY "Admins can update periodos_ponto" ON public.periodos_ponto
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete periodos_ponto" ON public.periodos_ponto;
CREATE POLICY "Admins can delete periodos_ponto" ON public.periodos_ponto
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- 12. WARN: Fix beneficios_colaborador - scope via colaborador empresa
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can manage beneficios_colaborador" ON public.beneficios_colaborador;

DROP POLICY IF EXISTS "Users can manage beneficios_colaborador" ON public.beneficios_colaborador;
CREATE POLICY "Users can manage beneficios_colaborador" ON public.beneficios_colaborador
  FOR ALL TO authenticated
  USING (
    colaborador_id IN (
      SELECT id FROM public.colaboradores
      WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))
    )
  )
  WITH CHECK (
    colaborador_id IN (
      SELECT id FROM public.colaboradores
      WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))
    )
  );

-- ============================================================
-- 13. WARN: Fix sindicatos - restrict writes to admin
-- ============================================================
DROP POLICY IF EXISTS "auth_sindicatos" ON public.sindicatos;

DROP POLICY IF EXISTS "Authenticated can read sindicatos" ON public.sindicatos;
CREATE POLICY "Authenticated can read sindicatos" ON public.sindicatos
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage sindicatos" ON public.sindicatos;
CREATE POLICY "Admins can manage sindicatos" ON public.sindicatos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update sindicatos" ON public.sindicatos;
CREATE POLICY "Admins can update sindicatos" ON public.sindicatos
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete sindicatos" ON public.sindicatos;
CREATE POLICY "Admins can delete sindicatos" ON public.sindicatos
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- 14. WARN: Fix rubricas_folha - restrict writes to admin
-- ============================================================
DROP POLICY IF EXISTS "auth_rubricas_folha" ON public.rubricas_folha;

DROP POLICY IF EXISTS "Authenticated can read rubricas_folha" ON public.rubricas_folha;
CREATE POLICY "Authenticated can read rubricas_folha" ON public.rubricas_folha
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage rubricas_folha" ON public.rubricas_folha;
CREATE POLICY "Admins can manage rubricas_folha" ON public.rubricas_folha
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update rubricas_folha" ON public.rubricas_folha;
CREATE POLICY "Admins can update rubricas_folha" ON public.rubricas_folha
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete rubricas_folha" ON public.rubricas_folha;
CREATE POLICY "Admins can delete rubricas_folha" ON public.rubricas_folha
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
