-- =====================================================================
-- Hardening: políticas sobre PII atribuídas à role "public"
-- "public" inclui anon. Os predicados abaixo já se correlacionam com
-- auth.uid() (nulo para anon), então não havia exposição — mas manter
-- a role aberta é uma linha de defesa a menos e faz o gate de auditoria
-- ficar barulhento. Recriamos todas como TO authenticated.
-- Aproveitamos para fechar dois buracos reais de WITH CHECK ausente.
-- =====================================================================

-- ---------- profiles ----------
-- Política defeituosa: compara auth.uid() com profiles.id (PK própria),
-- não com profiles.user_id. Verificado em produção: 0 de 1 linha têm
-- id = user_id, ou seja, a regra nunca libera nada e apenas duplica
-- ruído sobre a política correta. Removida.
DROP POLICY IF EXISTS "Profiles are viewable by own user" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  -- WITH CHECK impede reatribuir o próprio perfil para outro user_id.
  WITH CHECK (auth.uid() = user_id);

-- ---------- audit_logs ----------
DROP POLICY IF EXISTS "Users can view logs of their companies" ON public.audit_logs;
CREATE POLICY "Users can view logs of their companies"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT get_user_empresas(auth.uid()))
    OR is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert their own logs" ON public.audit_logs;
CREATE POLICY "Users can insert their own logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND empresa_id IN (SELECT get_user_empresas(auth.uid()))
  );

-- ---------- auditoria_logs ----------
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.auditoria_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.auditoria_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------- auth_gov_br_sessions ----------
DROP POLICY IF EXISTS "Usuários veem suas próprias sessões Gov.br" ON public.auth_gov_br_sessions;
CREATE POLICY "Usuários veem suas próprias sessões Gov.br"
  ON public.auth_gov_br_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ---------- empresas ----------
DROP POLICY IF EXISTS "Usuários podem ver suas empresas" ON public.empresas;
CREATE POLICY "Usuários podem ver suas empresas"
  ON public.empresas FOR SELECT TO authenticated
  USING (id IN (SELECT get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Admins podem gerenciar empresas" ON public.empresas;
CREATE POLICY "Admins podem gerenciar empresas"
  ON public.empresas FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ---------- holerites ----------
DROP POLICY IF EXISTS "Colaboradores podem ver seus próprios holerites" ON public.holerites;
CREATE POLICY "Colaboradores podem ver seus próprios holerites"
  ON public.holerites FOR SELECT TO authenticated
  USING (auth.uid() = colaborador_id);

-- ---------- portal_notificacoes_settings ----------
-- FOR ALL sem WITH CHECK: o UPDATE validava a linha antiga mas não a
-- nova, permitindo gravar user_id de terceiro. Fechado.
DROP POLICY IF EXISTS "Users can manage their own portal settings" ON public.portal_notificacoes_settings;
CREATE POLICY "Users can manage their own portal settings"
  ON public.portal_notificacoes_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------- relatorios_agendados ----------
-- Mesmo defeito: sem WITH CHECK era possível mover um agendamento
-- (que carrega destinatários e filtros) para outra empresa.
DROP POLICY IF EXISTS "Users can manage their company's schedules" ON public.relatorios_agendados;
CREATE POLICY "Users can manage their company's schedules"
  ON public.relatorios_agendados FOR ALL TO authenticated
  USING (public.pertence_a_empresa(empresa_id))
  WITH CHECK (public.pertence_a_empresa(empresa_id));

-- ---------- whatsapp_mensagens_logs ----------
DROP POLICY IF EXISTS "Gestores veem logs de mensagens WhatsApp" ON public.whatsapp_mensagens_logs;
CREATE POLICY "Gestores veem logs de mensagens WhatsApp"
  ON public.whatsapp_mensagens_logs FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'gestor'::app_role)
    OR public.has_role(auth.uid(), 'rh'::app_role)
  );

-- ---------- higiene de grants ----------
REVOKE ALL ON public.profiles, public.audit_logs, public.auditoria_logs,
  public.auth_gov_br_sessions, public.empresas, public.holerites,
  public.portal_notificacoes_settings, public.relatorios_agendados,
  public.whatsapp_mensagens_logs FROM anon;