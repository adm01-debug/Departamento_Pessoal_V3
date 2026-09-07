-- 2026-09-02: fecha o padrão "<col> IN (SELECT id FROM <tabela-mãe>)" —
-- parece escopar por empresa mas na verdade aceita QUALQUER empresa/cargo/
-- candidatura/colaborador válido do sistema, não o do solicitante. É uma
-- tautologia: para toda linha, o valor está OBVIAMENTE em "todos os ids da
-- tabela". scripts/audit-rls-tenant-open.mjs encontrou 44 ocorrências.
--
-- Depende de supabase/rebaseline/20260831_security_remediation.sql (usa
-- pertence_a_empresa, pode_gerir_rh).
--
-- Para cada tabela: se já existe uma policy irmã corretamente escopada
-- (get_user_empresas(auth.uid()) ou pertence_a_empresa), a tautológica é só
-- removida — a política correta já cobre o acesso. Onde não existia
-- nenhuma política correta, uma nova é criada preservando o comando
-- original (SELECT/UPDATE/ALL) para não alargar permissão de escrita que
-- antes não existia.

-- ---------------------------------------------------------------------------
-- Grupo A — DROP apenas: já existe policy irmã corretamente escopada.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Usuários podem ver configurações de suas empresas" ON public.cnab_configuracoes;
DROP POLICY IF EXISTS "RH pode ver notificacoes" ON public.notificacoes_admissao;
DROP POLICY IF EXISTS "view_pendencias" ON public.pendencias;
DROP POLICY IF EXISTS "Gestores podem ver logs de provisão" ON public.provisao_logs;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.times;
DROP POLICY IF EXISTS "Arquivos acessíveis por empresa" ON public.beneficio_arquivos; -- substituída abaixo (Grupo B)
DROP POLICY IF EXISTS "Templates acessíveis por empresa" ON public.documento_templates;
DROP POLICY IF EXISTS "Assinaturas acessíveis por empresa" ON public.documentos_assinatura;
DROP POLICY IF EXISTS "Empresas can manage their own epis" ON public.epis;
DROP POLICY IF EXISTS "Metas acessíveis por empresa" ON public.metas_okrs;
DROP POLICY IF EXISTS "Trilhas acessíveis por empresa" ON public.trilhas_aprendizado;
DROP POLICY IF EXISTS "Users can manage their company docs" ON public.documentos_afastamento;
DROP POLICY IF EXISTS "Users can view their company's delivery logs" ON public.log_envio_relatorios;
DROP POLICY IF EXISTS "Users can manage their company prorrogacoes" ON public.prorrogacoes_afastamento;
DROP POLICY IF EXISTS "audit_insert" ON public.auditoria;
DROP POLICY IF EXISTS "Empresas can insert their own CNAB remessas" ON public.cnab_remessas;
DROP POLICY IF EXISTS "Empresas can view their own CNAB remessas" ON public.cnab_remessas;
DROP POLICY IF EXISTS "Gestores veem solicitações da empresa" ON public.solicitacoes_ajuste_ponto;

-- ---------------------------------------------------------------------------
-- Grupo B — DROP + CREATE: nenhuma policy correta cobria o acesso ainda.
-- Coluna empresa_id direta: public.pertence_a_empresa(empresa_id).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Regras acessíveis por empresa" ON public.beneficio_regras_elegibilidade;
CREATE POLICY beneficio_regras_elegibilidade_tenant_all ON public.beneficio_regras_elegibilidade
  FOR ALL TO authenticated
  USING (public.pertence_a_empresa(empresa_id))
  WITH CHECK (public.pertence_a_empresa(empresa_id));

CREATE POLICY beneficio_arquivos_tenant_all ON public.beneficio_arquivos
  FOR ALL TO authenticated
  USING (public.pertence_a_empresa(empresa_id))
  WITH CHECK (public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Competências acessíveis por empresa" ON public.competencias_config;
CREATE POLICY competencias_config_tenant_all ON public.competencias_config
  FOR ALL TO authenticated
  USING (public.pertence_a_empresa(empresa_id))
  WITH CHECK (public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Configurações de ponto visíveis por membros da empresa" ON public.configuracoes_ponto;
CREATE POLICY configuracoes_ponto_tenant_select ON public.configuracoes_ponto
  FOR SELECT TO authenticated
  USING (public.pertence_a_empresa(empresa_id));
DROP POLICY IF EXISTS "Apenas admins podem atualizar configurações de ponto" ON public.configuracoes_ponto;
CREATE POLICY configuracoes_ponto_rh_update ON public.configuracoes_ponto
  FOR UPDATE TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

DROP POLICY IF EXISTS "View logs by company" ON public.conformidade_ponto_logs;
CREATE POLICY conformidade_ponto_logs_tenant_select ON public.conformidade_ponto_logs
  FOR SELECT TO authenticated
  USING (public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "View ferias audit by company" ON public.ferias_audit_log;
CREATE POLICY ferias_audit_log_tenant_select ON public.ferias_audit_log
  FOR SELECT TO authenticated
  USING (public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Empresas can view their own lancamentos" ON public.lancamentos_contabeis;
CREATE POLICY lancamentos_contabeis_tenant_select ON public.lancamentos_contabeis
  FOR SELECT TO authenticated
  USING (public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "PDIs acessíveis por empresa" ON public.pdi_plano_desenvolvimento;
CREATE POLICY pdi_plano_desenvolvimento_tenant_all ON public.pdi_plano_desenvolvimento
  FOR ALL TO authenticated
  USING (public.pertence_a_empresa(empresa_id))
  WITH CHECK (public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Empresas can view their own PIX lotes" ON public.pix_lotes;
CREATE POLICY pix_lotes_tenant_select ON public.pix_lotes
  FOR SELECT TO authenticated
  USING (public.pertence_a_empresa(empresa_id));
DROP POLICY IF EXISTS "Empresas can insert their own PIX lotes" ON public.pix_lotes;
CREATE POLICY pix_lotes_tenant_insert ON public.pix_lotes
  FOR INSERT TO authenticated
  WITH CHECK (public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Empresas can view their own plano de contas" ON public.plano_contas;
CREATE POLICY plano_contas_tenant_select ON public.plano_contas
  FOR SELECT TO authenticated
  USING (public.pertence_a_empresa(empresa_id));

CREATE POLICY ia_provisoes_alertas_tenant_select ON public.ia_provisoes_alertas
  FOR SELECT TO authenticated
  USING (public.pertence_a_empresa(empresa_id));
DROP POLICY IF EXISTS "Gestores podem ver alertas de IA" ON public.ia_provisoes_alertas;

CREATE POLICY permissao_perfis_tenant_select ON public.permissao_perfis
  FOR SELECT TO authenticated
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));
DROP POLICY IF EXISTS "Users can view profiles" ON public.permissao_perfis;

CREATE POLICY sst_regimento_interno_tenant_select ON public.sst_regimento_interno
  FOR SELECT TO authenticated
  USING (public.pertence_a_empresa(empresa_id));
DROP POLICY IF EXISTS "Leitura para autenticados" ON public.sst_regimento_interno;

CREATE POLICY sst_exposicao_riscos_rh_select ON public.sst_exposicao_riscos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = sst_exposicao_riscos.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ));
DROP POLICY IF EXISTS "Gestores de RH podem ver Riscos" ON public.sst_exposicao_riscos;

-- provisoes_folha: derivava o tenant de auth.jwt()->>'empresa_id' — claim
-- não verificada pelo Postgres e influenciável pelo próprio usuário no token.
DROP POLICY IF EXISTS "Visualização por empresa provisoes" ON public.provisoes_folha;
CREATE POLICY provisoes_folha_tenant_select ON public.provisoes_folha
  FOR SELECT TO authenticated
  USING (public.pertence_a_empresa(empresa_id));

-- ---------------------------------------------------------------------------
-- Grupo C — Coluna indireta (FK para tabela com empresa_id): EXISTS correlacionado.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Movimentações acessíveis por empresa" ON public.beneficio_movimentacoes;
CREATE POLICY beneficio_movimentacoes_tenant_all ON public.beneficio_movimentacoes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = beneficio_movimentacoes.colaborador_id
      AND public.pertence_a_empresa(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = beneficio_movimentacoes.colaborador_id
      AND public.pertence_a_empresa(c.empresa_id)
  ));

DROP POLICY IF EXISTS "Faixas acessíveis por empresa" ON public.cargo_faixas_salariais;
CREATE POLICY cargo_faixas_salariais_tenant_all ON public.cargo_faixas_salariais
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cargos cg
    WHERE cg.id = cargo_faixas_salariais.cargo_id
      AND public.pertence_a_empresa(cg.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cargos cg
    WHERE cg.id = cargo_faixas_salariais.cargo_id
      AND public.pertence_a_empresa(cg.empresa_id)
  ));

DROP POLICY IF EXISTS "Anotações acessíveis por empresa" ON public.recrutamento_anotacoes;
CREATE POLICY recrutamento_anotacoes_tenant_all ON public.recrutamento_anotacoes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.candidaturas cd
    WHERE cd.id = recrutamento_anotacoes.candidatura_id
      AND public.pertence_a_empresa(cd.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.candidaturas cd
    WHERE cd.id = recrutamento_anotacoes.candidatura_id
      AND public.pertence_a_empresa(cd.empresa_id)
  ));

DROP POLICY IF EXISTS "Entrevistas acessíveis por empresa" ON public.recrutamento_entrevistas;
CREATE POLICY recrutamento_entrevistas_tenant_all ON public.recrutamento_entrevistas
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.candidaturas cd
    WHERE cd.id = recrutamento_entrevistas.candidatura_id
      AND public.pertence_a_empresa(cd.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.candidaturas cd
    WHERE cd.id = recrutamento_entrevistas.candidatura_id
      AND public.pertence_a_empresa(cd.empresa_id)
  ));

DROP POLICY IF EXISTS "Testes acessíveis por empresa" ON public.recrutamento_testes;
CREATE POLICY recrutamento_testes_tenant_all ON public.recrutamento_testes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.candidaturas cd
    WHERE cd.id = recrutamento_testes.candidatura_id
      AND public.pertence_a_empresa(cd.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.candidaturas cd
    WHERE cd.id = recrutamento_testes.candidatura_id
      AND public.pertence_a_empresa(cd.empresa_id)
  ));

-- folha_auditoria: role-only (auth.role()='authenticated'), sem NENHUM
-- vínculo de tenant — qualquer autenticado via colaborador_id.
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar auditoria" ON public.folha_auditoria;
CREATE POLICY folha_auditoria_tenant_select ON public.folha_auditoria
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = folha_auditoria.colaborador_id
      AND public.pertence_a_empresa(c.empresa_id)
  ));
DROP POLICY IF EXISTS "Usuários autenticados podem inserir auditoria" ON public.folha_auditoria;
CREATE POLICY folha_auditoria_tenant_insert ON public.folha_auditoria
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = folha_auditoria.colaborador_id
      AND public.pertence_a_empresa(c.empresa_id)
  ));

-- ---------------------------------------------------------------------------
-- Grupo D — audit_log: três políticas se sobrepunham (true / claim JWT /
-- role solto). Consolidadas em uma leitura (RH da empresa OU o próprio
-- autor) e uma escrita (autor precisa ser quem grava, dentro da empresa).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "view_audit" ON public.audit_log;
DROP POLICY IF EXISTS "Users can view relevant audit_logs" ON public.audit_log;
CREATE POLICY audit_log_tenant_select ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (empresa_id IS NOT NULL AND public.pode_gerir_rh(empresa_id))
  );

DROP POLICY IF EXISTS "Authenticated users can insert audit_logs" ON public.audit_log;
CREATE POLICY audit_log_tenant_insert ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id))
  );

-- ---------------------------------------------------------------------------
-- Grupo E — solicitacoes_ajuste_ponto: "Gestores e RH aprovam" checava papel
-- mas escopava por "empresa_id IN (SELECT id FROM empresas)" (qualquer
-- empresa). Reconstruída com a mesma condição de papel + tenant real.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Gestores e RH aprovam solicitações" ON public.solicitacoes_ajuste_ponto;
CREATE POLICY solicitacoes_ajuste_ponto_rh_approve ON public.solicitacoes_ajuste_ponto
  FOR UPDATE TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (
    public.pode_gerir_rh(empresa_id)
    AND status = ANY (ARRAY['aprovado','recusado','revisao','encaminhado'])
  );
