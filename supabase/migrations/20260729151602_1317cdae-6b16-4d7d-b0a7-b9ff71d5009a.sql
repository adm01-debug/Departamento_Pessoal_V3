-- ============================================================
-- FOLHAS DE PAGAMENTO — 6 policies sobrepostas viram 2
-- ============================================================
DROP POLICY IF EXISTS "Empresa vê suas próprias folhas" ON public.folhas_pagamento;
DROP POLICY IF EXISTS "Folhas scoped by empresa" ON public.folhas_pagamento;
DROP POLICY IF EXISTS "Gestão de folha por cargo" ON public.folhas_pagamento;
DROP POLICY IF EXISTS "Leitura por empresa" ON public.folhas_pagamento;
DROP POLICY IF EXISTS "empresa_isolation_folhas" ON public.folhas_pagamento;
DROP POLICY IF EXISTS "tenant_folhas_pagamento" ON public.folhas_pagamento;

CREATE POLICY "folhas_rh_manage" ON public.folhas_pagamento
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY "folhas_gestor_read" ON public.folhas_pagamento
  FOR SELECT TO authenticated
  USING (public.pode_gerir_pessoas(empresa_id));

-- ============================================================
-- HISTORICO DE CALCULOS — claim 'empresa_id' nunca e emitido
-- ============================================================
DROP POLICY IF EXISTS "Acesso por empresa historico" ON public.historico_calculos_folha;
DROP POLICY IF EXISTS "Inserção por empresa historico" ON public.historico_calculos_folha;

CREATE POLICY "historico_calculos_rh" ON public.historico_calculos_folha
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

-- ============================================================
-- RUBRICAS DE FOLHA — mantem leitura global (tabela de dominio)
-- ============================================================
DROP POLICY IF EXISTS "Visualização por empresa ou global" ON public.rubricas_folha;
DROP POLICY IF EXISTS "Gerenciamento por admin" ON public.rubricas_folha;

CREATE POLICY "rubricas_read" ON public.rubricas_folha
  FOR SELECT TO authenticated
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

CREATE POLICY "rubricas_admin_manage" ON public.rubricas_folha
  FOR ALL TO authenticated
  USING (empresa_id IS NOT NULL AND public.pode_gerir_rh(empresa_id))
  WITH CHECK (empresa_id IS NOT NULL AND public.pode_gerir_rh(empresa_id));

-- ============================================================
-- COLABORADORES — 7 policies sobrepostas viram 3
-- ============================================================
DROP POLICY IF EXISTS "Admins manage employees in their empresas" ON public.colaboradores;
DROP POLICY IF EXISTS "Usuários podem atualizar colaboradores da sua empresa" ON public.colaboradores;
DROP POLICY IF EXISTS "Usuários podem deletar colaboradores da sua empresa" ON public.colaboradores;
DROP POLICY IF EXISTS "Usuários podem inserir colaboradores na sua empresa" ON public.colaboradores;
DROP POLICY IF EXISTS "Usuários podem ver colaboradores da sua empresa" ON public.colaboradores;
DROP POLICY IF EXISTS "colaboradores_tenant_all" ON public.colaboradores;
DROP POLICY IF EXISTS "Colaborador vê o próprio cadastro" ON public.colaboradores;

CREATE POLICY "colaboradores_rh_manage" ON public.colaboradores
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY "colaboradores_gestor_read" ON public.colaboradores
  FOR SELECT TO authenticated
  USING (public.pode_gerir_pessoas(empresa_id));

CREATE POLICY "colaboradores_self_read" ON public.colaboradores
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- QUERY TELEMETRY — comparava claim 'role' com 'admin' (sempre falso)
-- ============================================================
DROP POLICY IF EXISTS "Telemetria visível apenas para admins" ON public.query_telemetry;

CREATE POLICY "telemetria_admin_read" ON public.query_telemetry
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- FOLHA EVENTOS AUDITORIA — remove ramo do claim 'role'
-- ============================================================
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.folha_eventos_auditoria;

CREATE POLICY "folha_auditoria_admin_read" ON public.folha_eventos_auditoria
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));