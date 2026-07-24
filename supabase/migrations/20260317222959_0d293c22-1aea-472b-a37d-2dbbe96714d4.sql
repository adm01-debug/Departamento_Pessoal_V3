
-- 1. Fix admissao_tokens - scope via admissoes.empresa_id
DROP POLICY IF EXISTS "Authenticated users can manage admissao_tokens" ON public.admissao_tokens;
DROP POLICY IF EXISTS "Tenant scoped admissao_tokens" ON public.admissao_tokens;
CREATE POLICY "Tenant scoped admissao_tokens" ON public.admissao_tokens
  FOR ALL TO authenticated
  USING (admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))))
  WITH CHECK (admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))));

-- 2. Fix documentos_admissao - scope via admissoes.empresa_id
DROP POLICY IF EXISTS "Authenticated users can manage documentos_admissao" ON public.documentos_admissao;
DROP POLICY IF EXISTS "Tenant scoped documentos_admissao" ON public.documentos_admissao;
CREATE POLICY "Tenant scoped documentos_admissao" ON public.documentos_admissao
  FOR ALL TO authenticated
  USING (admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))))
  WITH CHECK (admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))));

-- 3. Fix notificacoes_admissao - scope via admissoes.empresa_id
DROP POLICY IF EXISTS "Authenticated users can manage notificacoes_admissao" ON public.notificacoes_admissao;
DROP POLICY IF EXISTS "Tenant scoped notificacoes_admissao" ON public.notificacoes_admissao;
CREATE POLICY "Tenant scoped notificacoes_admissao" ON public.notificacoes_admissao
  FOR ALL TO authenticated
  USING (admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))))
  WITH CHECK (admissao_id IN (SELECT id FROM public.admissoes WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))));

-- 4. Fix onboarding_colaborador - scope via colaboradores.empresa_id
DROP POLICY IF EXISTS "Authenticated users can manage onboarding_colaborador" ON public.onboarding_colaborador;
DROP POLICY IF EXISTS "Tenant scoped onboarding_colaborador" ON public.onboarding_colaborador;
CREATE POLICY "Tenant scoped onboarding_colaborador" ON public.onboarding_colaborador
  FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))));

-- 5. Fix onboarding_tarefas - scope via onboarding_colaborador -> colaboradores
DROP POLICY IF EXISTS "Authenticated users can manage onboarding_tarefas" ON public.onboarding_tarefas;
DROP POLICY IF EXISTS "Tenant scoped onboarding_tarefas" ON public.onboarding_tarefas;
CREATE POLICY "Tenant scoped onboarding_tarefas" ON public.onboarding_tarefas
  FOR ALL TO authenticated
  USING (onboarding_id IN (SELECT oc.id FROM public.onboarding_colaborador oc JOIN public.colaboradores c ON c.id = oc.colaborador_id WHERE c.empresa_id IN (SELECT get_user_empresas(auth.uid()))))
  WITH CHECK (onboarding_id IN (SELECT oc.id FROM public.onboarding_colaborador oc JOIN public.colaboradores c ON c.id = oc.colaborador_id WHERE c.empresa_id IN (SELECT get_user_empresas(auth.uid()))));

-- 6. Fix onboarding_template_tarefas - scope via onboarding_templates.empresa_id
DROP POLICY IF EXISTS "Authenticated users can manage onboarding_template_tarefas" ON public.onboarding_template_tarefas;
DROP POLICY IF EXISTS "Tenant scoped onboarding_template_tarefas" ON public.onboarding_template_tarefas;
CREATE POLICY "Tenant scoped onboarding_template_tarefas" ON public.onboarding_template_tarefas
  FOR ALL TO authenticated
  USING (template_id IN (SELECT id FROM public.onboarding_templates WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))))
  WITH CHECK (template_id IN (SELECT id FROM public.onboarding_templates WHERE empresa_id IN (SELECT get_user_empresas(auth.uid()))));

-- 7. Fix tipos_beneficio - read for all, write for admin
DROP POLICY IF EXISTS "Authenticated users can manage tipos_beneficio" ON public.tipos_beneficio;
DROP POLICY IF EXISTS "Authenticated users can view tipos_beneficio" ON public.tipos_beneficio;
DROP POLICY IF EXISTS "Authenticated can read tipos_beneficio" ON public.tipos_beneficio;
CREATE POLICY "Authenticated can read tipos_beneficio" ON public.tipos_beneficio
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage tipos_beneficio" ON public.tipos_beneficio;
CREATE POLICY "Admins can manage tipos_beneficio" ON public.tipos_beneficio
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can update tipos_beneficio" ON public.tipos_beneficio;
CREATE POLICY "Admins can update tipos_beneficio" ON public.tipos_beneficio
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can delete tipos_beneficio" ON public.tipos_beneficio;
CREATE POLICY "Admins can delete tipos_beneficio" ON public.tipos_beneficio
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- 8. Fix config_afastamentos - change from public to authenticated
DROP POLICY IF EXISTS "Authenticated users can view config_afastamentos" ON public.config_afastamentos;
CREATE POLICY "Authenticated users can view config_afastamentos" ON public.config_afastamentos
  FOR SELECT TO authenticated USING (true);

-- 9. Fix historico_alertas SELECT - change from public to authenticated
DROP POLICY IF EXISTS "Authenticated users can view historico_alertas" ON public.historico_alertas;
CREATE POLICY "Authenticated users can view historico_alertas" ON public.historico_alertas
  FOR SELECT TO authenticated USING (true);

-- 10. Fix config_alertas_indicadores SELECT - change from public to authenticated
DROP POLICY IF EXISTS "Authenticated users can view config_alertas" ON public.config_alertas_indicadores;
CREATE POLICY "Authenticated users can view config_alertas" ON public.config_alertas_indicadores
  FOR SELECT TO authenticated USING (true);
