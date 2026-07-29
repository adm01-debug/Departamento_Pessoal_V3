-- ============================================================
-- Resíduo da etapa 4: SELECT tenant-wide sobrevivente.
-- Policies sao OR: esta regra anulava as tres criadas antes.
-- ============================================================
DROP POLICY IF EXISTS "tenant_desligamentos_select" ON public.desligamentos;

-- ============================================================
-- SAUDE / DOCUMENTOS PESSOAIS  (ancorados em colaborador_id)
-- ============================================================
DROP POLICY IF EXISTS "tenant_exames" ON public.exames;
CREATE POLICY "exames_rh_manage" ON public.exames FOR ALL TO authenticated
  USING (public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id)))
  WITH CHECK (public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id)));
CREATE POLICY "exames_self_read" ON public.exames FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

DROP POLICY IF EXISTS "tenant_documentos_pessoais_arquivos" ON public.documentos_pessoais_arquivos;
CREATE POLICY "docpessoais_rh_manage" ON public.documentos_pessoais_arquivos FOR ALL TO authenticated
  USING (public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id)))
  WITH CHECK (public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id)));
CREATE POLICY "docpessoais_self_read" ON public.documentos_pessoais_arquivos FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

DROP POLICY IF EXISTS "tenant_beneficiarios_plano" ON public.beneficiarios_plano;
CREATE POLICY "beneficiarios_plano_rh_manage" ON public.beneficiarios_plano FOR ALL TO authenticated
  USING (public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id)))
  WITH CHECK (public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id)));
CREATE POLICY "beneficiarios_plano_self_read" ON public.beneficiarios_plano FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

-- ============================================================
-- DADOS CADASTRAIS DE AUTO-SERVICO
-- O titular mantem os proprios (contato de emergencia e formacao
-- sao dados que a propria pessoa atualiza no portal).
-- ============================================================
DROP POLICY IF EXISTS "tenant_contatos_emergencia" ON public.contatos_emergencia;
CREATE POLICY "contatos_emergencia_rh_manage" ON public.contatos_emergencia FOR ALL TO authenticated
  USING (public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id)))
  WITH CHECK (public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id)));
CREATE POLICY "contatos_emergencia_self" ON public.contatos_emergencia FOR ALL TO authenticated
  USING (public.sou_o_colaborador(colaborador_id))
  WITH CHECK (public.sou_o_colaborador(colaborador_id));

DROP POLICY IF EXISTS "tenant_formacoes_academicas" ON public.formacoes_academicas;
CREATE POLICY "formacoes_rh_manage" ON public.formacoes_academicas FOR ALL TO authenticated
  USING (public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id)))
  WITH CHECK (public.pode_gerir_rh(public.empresa_do_colaborador(colaborador_id)));
CREATE POLICY "formacoes_self" ON public.formacoes_academicas FOR ALL TO authenticated
  USING (public.sou_o_colaborador(colaborador_id))
  WITH CHECK (public.sou_o_colaborador(colaborador_id));

-- ============================================================
-- ANOTACOES DE GESTAO
-- Avaliacao interna sobre a pessoa: sem auto-leitura por design.
-- ============================================================
DROP POLICY IF EXISTS "tenant_anotacoes_colaborador" ON public.anotacoes_colaborador;
CREATE POLICY "anotacoes_gestao_manage" ON public.anotacoes_colaborador FOR ALL TO authenticated
  USING (public.pode_gerir_pessoas(public.empresa_do_colaborador(colaborador_id)))
  WITH CHECK (public.pode_gerir_pessoas(public.empresa_do_colaborador(colaborador_id)));

-- ============================================================
-- FOLHA: ITENS, LANCAMENTOS E RESCISOES
-- ============================================================
DROP POLICY IF EXISTS "Folha itens scoped via folha" ON public.folha_itens;
CREATE POLICY "folha_itens_rh_manage" ON public.folha_itens FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.folhas_pagamento f
                 WHERE f.id = folha_itens.folha_id AND public.pode_gerir_rh(f.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.folhas_pagamento f
                 WHERE f.id = folha_itens.folha_id AND public.pode_gerir_rh(f.empresa_id)));
CREATE POLICY "folha_itens_self_read" ON public.folha_itens FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

DROP POLICY IF EXISTS "tenant_lancamentos_folha" ON public.lancamentos_folha;
CREATE POLICY "lancamentos_folha_rh_manage" ON public.lancamentos_folha FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.holerites h
                 WHERE h.id = lancamentos_folha.holerite_id
                   AND public.pode_gerir_rh(public.empresa_do_colaborador(h.colaborador_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.holerites h
                 WHERE h.id = lancamentos_folha.holerite_id
                   AND public.pode_gerir_rh(public.empresa_do_colaborador(h.colaborador_id))));
CREATE POLICY "lancamentos_folha_self_read" ON public.lancamentos_folha FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.holerites h
                 WHERE h.id = lancamentos_folha.holerite_id
                   AND public.sou_o_colaborador(h.colaborador_id)));

DROP POLICY IF EXISTS "Rescisoes por empresa" ON public.historico_rescisoes;
CREATE POLICY "rescisoes_gestao_read" ON public.historico_rescisoes FOR SELECT TO authenticated
  USING (public.pode_gerir_pessoas(empresa_id));

-- ============================================================
-- REMESSAS BANCARIAS: exclusivas de RH/Admin
-- ============================================================
DROP POLICY IF EXISTS "cnab_itens_tenant_select" ON public.cnab_itens;
CREATE POLICY "cnab_itens_rh_select" ON public.cnab_itens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cnab_remessas r
                 WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id)));

DROP POLICY IF EXISTS "pix_itens_tenant_select" ON public.pix_itens;
CREATE POLICY "pix_itens_rh_select" ON public.pix_itens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pix_lotes l
                 WHERE l.id = pix_itens.lote_id AND public.pode_gerir_rh(l.empresa_id)));