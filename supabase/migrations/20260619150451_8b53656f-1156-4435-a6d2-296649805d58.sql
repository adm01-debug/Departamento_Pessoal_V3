-- ============================================================
-- DROPs de políticas permissivas duplicadas/redundantes
-- ============================================================
DROP POLICY IF EXISTS "RH pode gerenciar tokens" ON public.admissao_tokens;
DROP POLICY IF EXISTS "Acesso documentos por afastamento" ON public.documentos_afastamento;
DROP POLICY IF EXISTS "Acesso prorrogacoes por afastamento" ON public.prorrogacoes_afastamento;
DROP POLICY IF EXISTS "Permissive access for rewards" ON public.premiacoes_auditoria;
DROP POLICY IF EXISTS "Permissive access for rewards" ON public.premiacoes_campanhas;
DROP POLICY IF EXISTS "Permissive access for rewards" ON public.premiacoes_pagamentos;
DROP POLICY IF EXISTS "Users can manage rewards payments" ON public.premiacoes_pagamentos;
DROP POLICY IF EXISTS "Users can view rewards payments" ON public.premiacoes_pagamentos;
DROP POLICY IF EXISTS "Permissive access for rewards" ON public.premiacoes_regras;
DROP POLICY IF EXISTS "Users can manage rewards rules" ON public.premiacoes_regras;
DROP POLICY IF EXISTS "Users can view rewards rules" ON public.premiacoes_regras;
DROP POLICY IF EXISTS "Permissive access for rewards" ON public.premiacoes_roi_cenarios;
DROP POLICY IF EXISTS "Gestores podem ver e editar ajustes da equipe" ON public.ponto_ajustes;
DROP POLICY IF EXISTS "Acesso total as configuracoes" ON public.config_afastamentos;
DROP POLICY IF EXISTS "Sistema gerencia logs" ON public.conformidade_ponto_logs;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.promo_brindes;
DROP POLICY IF EXISTS "Enable update for all users" ON public.promo_brindes;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.promo_brindes;
DROP POLICY IF EXISTS "Authenticated users can delete telemetry" ON public.query_telemetry;
DROP POLICY IF EXISTS "Authenticated users can insert telemetry" ON public.query_telemetry;
DROP POLICY IF EXISTS "Authenticated users can read telemetry" ON public.query_telemetry;
DROP POLICY IF EXISTS "Users can create simulations" ON public.simulacoes_fiscais;
DROP POLICY IF EXISTS "Users can view simulations of their companies" ON public.simulacoes_fiscais;
DROP POLICY IF EXISTS "solicitacoes_insert_policy" ON public.solicitacoes_ajuste_ponto;
DROP POLICY IF EXISTS "Serviço pode gerenciar states" ON public.govbr_auth_state;
DROP POLICY IF EXISTS "Anyone can insert logs" ON public.logs_sistema;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.times;
DROP POLICY IF EXISTS "Enable update for all users" ON public.times;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.times;
DROP POLICY IF EXISTS "Enable insert for all" ON public.times_brindes;
DROP POLICY IF EXISTS "Enable update for all" ON public.times_brindes;
DROP POLICY IF EXISTS "Enable delete for all" ON public.times_brindes;
DROP POLICY IF EXISTS "Histórico acessível por documento" ON public.documentos_historico;
DROP POLICY IF EXISTS "Feedbacks acessíveis por inscrição" ON public.treinamento_feedback;
DROP POLICY IF EXISTS "Instâncias acessíveis por empresa" ON public.treinamento_instancias;

-- ============================================================
-- SUBSTITUIÇÕES — políticas únicas com `true` trocadas por escopo
-- ============================================================
DROP POLICY IF EXISTS "RH pode gerenciar admissoes" ON public.admissoes;
DROP POLICY IF EXISTS "Admissoes scoped by empresa" ON public.admissoes;
CREATE POLICY "Admissoes scoped by empresa" ON public.admissoes FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Acesso por empresa_id em afastamentos" ON public.afastamentos;
DROP POLICY IF EXISTS "Afastamentos scoped by empresa" ON public.afastamentos;
CREATE POLICY "Afastamentos scoped by empresa" ON public.afastamentos FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Users can manage certificates" ON public.certificados_digitais;
DROP POLICY IF EXISTS "Certificados scoped by empresa" ON public.certificados_digitais;
CREATE POLICY "Certificados scoped by empresa" ON public.certificados_digitais FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Usuários podem gerenciar configurações bancárias" ON public.cnab_configuracoes;
DROP POLICY IF EXISTS "CNAB config scoped by empresa" ON public.cnab_configuracoes;
CREATE POLICY "CNAB config scoped by empresa" ON public.cnab_configuracoes FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Empresas gerenciam suas proprias folhas" ON public.folhas_pagamento;
DROP POLICY IF EXISTS "Folhas scoped by empresa" ON public.folhas_pagamento;
CREATE POLICY "Folhas scoped by empresa" ON public.folhas_pagamento FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Empresas gerenciam itens da folha" ON public.folha_itens;
DROP POLICY IF EXISTS "Folha itens scoped via folha" ON public.folha_itens;
CREATE POLICY "Folha itens scoped via folha" ON public.folha_itens FOR ALL TO authenticated
  USING (folha_id IN (SELECT id FROM public.folhas_pagamento WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (folha_id IN (SELECT id FROM public.folhas_pagamento WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

DROP POLICY IF EXISTS "manage_pendencias" ON public.pendencias;
DROP POLICY IF EXISTS "Pendencias scoped by empresa" ON public.pendencias;
CREATE POLICY "Pendencias scoped by empresa" ON public.pendencias FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Gestores podem gerenciar regras" ON public.ponto_regras_aprovacao;
DROP POLICY IF EXISTS "Ponto regras scoped by empresa" ON public.ponto_regras_aprovacao;
CREATE POLICY "Ponto regras scoped by empresa" ON public.ponto_regras_aprovacao FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "RH pode ver logs de provisao" ON public.provisao_logs;
DROP POLICY IF EXISTS "Provisao logs scoped by empresa" ON public.provisao_logs;
CREATE POLICY "Provisao logs scoped by empresa" ON public.provisao_logs FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "RH pode gerenciar provisoes" ON public.provisoes_mensais;
DROP POLICY IF EXISTS "Provisoes scoped by empresa" ON public.provisoes_mensais;
CREATE POLICY "Provisoes scoped by empresa" ON public.provisoes_mensais FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- times: tabela tem empresa_id mas pode não existir empresa_id em todos; usar escopo
-- (verificado acima: tem empresa_id)
DROP POLICY IF EXISTS "Times insert scoped" ON public.times;
CREATE POLICY "Times insert scoped" ON public.times FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "Times update scoped" ON public.times;
CREATE POLICY "Times update scoped" ON public.times FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
DROP POLICY IF EXISTS "Times delete scoped" ON public.times;
CREATE POLICY "Times delete scoped" ON public.times FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- times_brindes (catálogo global): só admin pode escrever
DROP POLICY IF EXISTS "Times brindes admin write" ON public.times_brindes;
CREATE POLICY "Times brindes admin write" ON public.times_brindes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Times brindes admin update" ON public.times_brindes;
CREATE POLICY "Times brindes admin update" ON public.times_brindes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Times brindes admin delete" ON public.times_brindes;
CREATE POLICY "Times brindes admin delete" ON public.times_brindes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- promo_brindes (catálogo global): só admin pode escrever
DROP POLICY IF EXISTS "Promo brindes admin write" ON public.promo_brindes;
CREATE POLICY "Promo brindes admin write" ON public.promo_brindes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Promo brindes admin update" ON public.promo_brindes;
CREATE POLICY "Promo brindes admin update" ON public.promo_brindes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Promo brindes admin delete" ON public.promo_brindes;
CREATE POLICY "Promo brindes admin delete" ON public.promo_brindes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Recriar políticas mínimas em premiacoes_pagamentos/regras (ficaram só com a admin existente)
DROP POLICY IF EXISTS "Premiacoes pagamentos scoped" ON public.premiacoes_pagamentos;
CREATE POLICY "Premiacoes pagamentos scoped" ON public.premiacoes_pagamentos FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Premiacoes regras scoped" ON public.premiacoes_regras;
CREATE POLICY "Premiacoes regras scoped" ON public.premiacoes_regras FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Tabelas auxiliares de premiações sem coluna empresa_id: pelo menos exigir auth nas escritas
DROP POLICY IF EXISTS "Premiacoes pagamentos write admin" ON public.premiacoes_pagamentos;
CREATE POLICY "Premiacoes pagamentos write admin" ON public.premiacoes_pagamentos FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'));
DROP POLICY IF EXISTS "Premiacoes pagamentos update admin" ON public.premiacoes_pagamentos;
CREATE POLICY "Premiacoes pagamentos update admin" ON public.premiacoes_pagamentos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'));
DROP POLICY IF EXISTS "Premiacoes regras write admin" ON public.premiacoes_regras;
CREATE POLICY "Premiacoes regras write admin" ON public.premiacoes_regras FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'));
DROP POLICY IF EXISTS "Premiacoes regras update admin" ON public.premiacoes_regras;
CREATE POLICY "Premiacoes regras update admin" ON public.premiacoes_regras FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'));

-- documentos_historico: exigir autenticação (acesso via FK documento_id - controlada upstream)
DROP POLICY IF EXISTS "Documentos historico authenticated" ON public.documentos_historico;
CREATE POLICY "Documentos historico authenticated" ON public.documentos_historico FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- treinamento_feedback: via inscrição (autenticado)
DROP POLICY IF EXISTS "Treinamento feedback authenticated" ON public.treinamento_feedback;
CREATE POLICY "Treinamento feedback authenticated" ON public.treinamento_feedback FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- treinamento_instancias: via empresa do curso
DROP POLICY IF EXISTS "Treinamento instancias authenticated" ON public.treinamento_instancias;
CREATE POLICY "Treinamento instancias authenticated" ON public.treinamento_instancias FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);