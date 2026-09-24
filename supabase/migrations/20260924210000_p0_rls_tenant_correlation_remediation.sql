-- P0: remediação de políticas RLS PERMISSIVAS sem correlação de tenant —
-- fecha as 44 violações apontadas por scripts/audit-rls-tenant-open.mjs em
-- ~41 tabelas multi-tenant. Antes desta migração, os predicados eram
-- `empresa_id IN (SELECT id FROM empresas)` (todas as empresas do banco,
-- não só a do solicitante), `auth.uid() IS NOT NULL`/`true`/
-- `auth.role() = 'authenticated'` (só verifica login, não isolamento de
-- tenant), ou vazios. Como políticas PERMISSIVE se combinam por OR, cada uma
-- dessas era suficiente sozinha para vazar a tabela inteira entre empresas —
-- foi exatamente o padrão que vazou `rubricas_folha` mesmo com uma política
-- correta coexistindo (ver comentário no próprio audit-rls-tenant-open.mjs).
--
-- Nenhuma das tabelas aqui está em TABELAS_SENSIVEIS do
-- audit-rls-least-privilege.mjs (essa foi endereçada na migração anterior,
-- 20260924200000) — este gate exige apenas correlação com o solicitante
-- (pertence_a_empresa/auth.uid()), não necessariamente papel de RH.

-- ── Tabelas com empresa_id direto ──────────────────────────────────────
DROP POLICY IF EXISTS "Arquivos acessíveis por empresa" ON public.beneficio_arquivos;
CREATE POLICY "Arquivos acessíveis por empresa" ON public.beneficio_arquivos
  FOR ALL TO public
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id))
  WITH CHECK (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Regras acessíveis por empresa" ON public.beneficio_regras_elegibilidade;
CREATE POLICY "Regras acessíveis por empresa" ON public.beneficio_regras_elegibilidade
  FOR ALL TO public
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id))
  WITH CHECK (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Competências acessíveis por empresa" ON public.competencias_config;
CREATE POLICY "Competências acessíveis por empresa" ON public.competencias_config
  FOR ALL TO public
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id))
  WITH CHECK (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Apenas admins podem atualizar configurações de ponto" ON public.configuracoes_ponto;
CREATE POLICY "Apenas admins podem atualizar configurações de ponto" ON public.configuracoes_ponto
  FOR UPDATE TO public
  USING (public.pertence_a_empresa(empresa_id))
  WITH CHECK (public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Configurações de ponto visíveis por membros da empresa" ON public.configuracoes_ponto;
CREATE POLICY "Configurações de ponto visíveis por membros da empresa" ON public.configuracoes_ponto
  FOR SELECT TO public
  USING (public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "View logs by company" ON public.conformidade_ponto_logs;
CREATE POLICY "View logs by company" ON public.conformidade_ponto_logs
  FOR SELECT TO public
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Templates acessíveis por empresa" ON public.documento_templates;
CREATE POLICY "Templates acessíveis por empresa" ON public.documento_templates
  FOR ALL TO public
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id))
  WITH CHECK (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Assinaturas acessíveis por empresa" ON public.documentos_assinatura;
CREATE POLICY "Assinaturas acessíveis por empresa" ON public.documentos_assinatura
  FOR ALL TO public
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id))
  WITH CHECK (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Empresas can manage their own epis" ON public.epis;
CREATE POLICY "Empresas can manage their own epis" ON public.epis
  FOR ALL TO public
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id))
  WITH CHECK (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "View ferias audit by company" ON public.ferias_audit_log;
CREATE POLICY "View ferias audit by company" ON public.ferias_audit_log
  FOR SELECT TO public
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Gestores podem ver alertas de IA" ON public.ia_provisoes_alertas;
CREATE POLICY "Gestores podem ver alertas de IA" ON public.ia_provisoes_alertas
  FOR SELECT TO authenticated
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Empresas can view their own lancamentos" ON public.lancamentos_contabeis;
CREATE POLICY "Empresas can view their own lancamentos" ON public.lancamentos_contabeis
  FOR SELECT TO public
  USING (public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Metas acessíveis por empresa" ON public.metas_okrs;
CREATE POLICY "Metas acessíveis por empresa" ON public.metas_okrs
  FOR ALL TO public
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id))
  WITH CHECK (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Users can view system parameters" ON public.parametros_sistema;
CREATE POLICY "Users can view system parameters" ON public.parametros_sistema
  FOR SELECT TO authenticated
  USING (public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "PDIs acessíveis por empresa" ON public.pdi_plano_desenvolvimento;
CREATE POLICY "PDIs acessíveis por empresa" ON public.pdi_plano_desenvolvimento
  FOR ALL TO public
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id))
  WITH CHECK (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS view_pendencias ON public.pendencias;
CREATE POLICY view_pendencias ON public.pendencias
  FOR SELECT TO authenticated
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Users can view profiles" ON public.permissao_perfis;
CREATE POLICY "Users can view profiles" ON public.permissao_perfis
  FOR SELECT TO authenticated
  USING (public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Empresas can view their own plano de contas" ON public.plano_contas;
CREATE POLICY "Empresas can view their own plano de contas" ON public.plano_contas
  FOR SELECT TO public
  USING (public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Gestores podem ver logs de provisão" ON public.provisao_logs;
CREATE POLICY "Gestores podem ver logs de provisão" ON public.provisao_logs
  FOR SELECT TO authenticated
  USING (public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Anotações acessíveis por empresa" ON public.recrutamento_anotacoes;
CREATE POLICY "Anotações acessíveis por empresa" ON public.recrutamento_anotacoes
  FOR ALL TO public
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id))
  WITH CHECK (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Entrevistas acessíveis por empresa" ON public.recrutamento_entrevistas;
CREATE POLICY "Entrevistas acessíveis por empresa" ON public.recrutamento_entrevistas
  FOR ALL TO public
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id))
  WITH CHECK (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Testes acessíveis por empresa" ON public.recrutamento_testes;
CREATE POLICY "Testes acessíveis por empresa" ON public.recrutamento_testes
  FOR ALL TO public
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id))
  WITH CHECK (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Gestores veem solicitações da empresa" ON public.solicitacoes_ajuste_ponto;
CREATE POLICY "Gestores veem solicitações da empresa" ON public.solicitacoes_ajuste_ponto
  FOR SELECT TO public
  USING (public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Leitura para autenticados" ON public.sst_regimento_interno;
CREATE POLICY "Leitura para autenticados" ON public.sst_regimento_interno
  FOR SELECT TO public
  USING (public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Enable read access for all users" ON public.times;
CREATE POLICY "Enable read access for all users" ON public.times
  FOR SELECT TO authenticated
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Treinamento instancias authenticated" ON public.treinamento_instancias;
CREATE POLICY "Treinamento instancias authenticated" ON public.treinamento_instancias
  FOR ALL TO authenticated
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id))
  WITH CHECK (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Trilhas acessíveis por empresa" ON public.trilhas_aprendizado;
CREATE POLICY "Trilhas acessíveis por empresa" ON public.trilhas_aprendizado
  FOR ALL TO public
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id))
  WITH CHECK (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

-- ── INSERT de log/auditoria — autocorrelação com quem grava ───────────
DROP POLICY IF EXISTS audit_insert ON public.auditoria;
CREATE POLICY audit_insert ON public.auditoria
  FOR INSERT TO public
  WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS auditoria_logs_insert ON public.auditoria_logs;
CREATE POLICY auditoria_logs_insert ON public.auditoria_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── Tabelas-filha sem empresa_id — correlação via FK até o tenant ─────
DROP POLICY IF EXISTS "Movimentações acessíveis por empresa" ON public.beneficio_movimentacoes;
CREATE POLICY "Movimentações acessíveis por empresa" ON public.beneficio_movimentacoes
  FOR ALL TO public
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = beneficio_movimentacoes.colaborador_id AND public.pertence_a_empresa(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = beneficio_movimentacoes.colaborador_id AND public.pertence_a_empresa(c.empresa_id)
  ));

DROP POLICY IF EXISTS "Faixas acessíveis por empresa" ON public.cargo_faixas_salariais;
CREATE POLICY "Faixas acessíveis por empresa" ON public.cargo_faixas_salariais
  FOR ALL TO public
  USING (EXISTS (
    SELECT 1 FROM public.cargos cg
    WHERE cg.id = cargo_faixas_salariais.cargo_id
      AND (cg.empresa_id IS NULL OR public.pertence_a_empresa(cg.empresa_id))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cargos cg
    WHERE cg.id = cargo_faixas_salariais.cargo_id
      AND (cg.empresa_id IS NULL OR public.pertence_a_empresa(cg.empresa_id))
  ));

DROP POLICY IF EXISTS "Users can manage their company docs" ON public.documentos_afastamento;
CREATE POLICY "Users can manage their company docs" ON public.documentos_afastamento
  FOR ALL TO public
  USING (EXISTS (
    SELECT 1 FROM public.afastamentos a
    WHERE a.id = documentos_afastamento.afastamento_id AND public.pertence_a_empresa(a.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.afastamentos a
    WHERE a.id = documentos_afastamento.afastamento_id AND public.pertence_a_empresa(a.empresa_id)
  ));

DROP POLICY IF EXISTS "Users can manage their company prorrogacoes" ON public.prorrogacoes_afastamento;
CREATE POLICY "Users can manage their company prorrogacoes" ON public.prorrogacoes_afastamento
  FOR ALL TO public
  USING (EXISTS (
    SELECT 1 FROM public.afastamentos a
    WHERE a.id = prorrogacoes_afastamento.afastamento_id AND public.pertence_a_empresa(a.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.afastamentos a
    WHERE a.id = prorrogacoes_afastamento.afastamento_id AND public.pertence_a_empresa(a.empresa_id)
  ));

DROP POLICY IF EXISTS "Usuários autenticados podem inserir auditoria" ON public.folha_auditoria;
CREATE POLICY "Usuários autenticados podem inserir auditoria" ON public.folha_auditoria
  FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.folhas_pagamento f
    WHERE f.id = folha_auditoria.folha_id
      AND (f.empresa_id IS NULL OR public.pertence_a_empresa(f.empresa_id))
  ));

DROP POLICY IF EXISTS "Usuários autenticados podem visualizar auditoria" ON public.folha_auditoria;
CREATE POLICY "Usuários autenticados podem visualizar auditoria" ON public.folha_auditoria
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.folhas_pagamento f
    WHERE f.id = folha_auditoria.folha_id
      AND (f.empresa_id IS NULL OR public.pertence_a_empresa(f.empresa_id))
  ));

DROP POLICY IF EXISTS "Users can view their company's delivery logs" ON public.log_envio_relatorios;
CREATE POLICY "Users can view their company's delivery logs" ON public.log_envio_relatorios
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.relatorios_agendados r
    WHERE r.id = log_envio_relatorios.agendamento_id AND public.pertence_a_empresa(r.empresa_id)
  ));

DROP POLICY IF EXISTS "Premiacoes pagamentos scoped" ON public.premiacoes_pagamentos;
CREATE POLICY "Premiacoes pagamentos scoped" ON public.premiacoes_pagamentos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.premiacoes_campanhas pc
    WHERE pc.id = premiacoes_pagamentos.campanha_id AND public.pertence_a_empresa(pc.empresa_id)
  ));

DROP POLICY IF EXISTS "Premiacoes regras scoped" ON public.premiacoes_regras;
CREATE POLICY "Premiacoes regras scoped" ON public.premiacoes_regras
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.premiacoes_campanhas pc
    WHERE pc.id = premiacoes_regras.campanha_id AND public.pertence_a_empresa(pc.empresa_id)
  ));

DROP POLICY IF EXISTS "Gestores de RH podem ver Riscos" ON public.sst_exposicao_riscos;
CREATE POLICY "Gestores de RH podem ver Riscos" ON public.sst_exposicao_riscos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = sst_exposicao_riscos.colaborador_id AND public.pertence_a_empresa(c.empresa_id)
  ));

DROP POLICY IF EXISTS "Enable read for all" ON public.times_brindes;
CREATE POLICY "Enable read for all" ON public.times_brindes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.times t
    WHERE t.id = times_brindes.time_id AND (t.empresa_id IS NULL OR public.pertence_a_empresa(t.empresa_id))
  ));

DROP POLICY IF EXISTS "Treinamento feedback authenticated" ON public.treinamento_feedback;
CREATE POLICY "Treinamento feedback authenticated" ON public.treinamento_feedback
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.inscricoes_cursos ic
    WHERE ic.id = treinamento_feedback.inscricao_id
      AND (ic.empresa_id IS NULL OR public.pertence_a_empresa(ic.empresa_id))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.inscricoes_cursos ic
    WHERE ic.id = treinamento_feedback.inscricao_id
      AND (ic.empresa_id IS NULL OR public.pertence_a_empresa(ic.empresa_id))
  ));

-- documentos_historico e trilha_auditoria_ponto: tabelas de log vazias em
-- produção (0 linhas), sem uso real ainda. Autocorrelação com quem gravou
-- fecha o gate sem inventar uma regra de negócio de visualização por
-- terceiros que este achado não pediu.
DROP POLICY IF EXISTS "Documentos historico authenticated" ON public.documentos_historico;
CREATE POLICY "Documentos historico authenticated" ON public.documentos_historico
  FOR ALL TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Acesso à trilha de auditoria" ON public.trilha_auditoria_ponto;
CREATE POLICY "Acesso à trilha de auditoria" ON public.trilha_auditoria_ponto
  FOR SELECT TO public
  USING (usuario_id = auth.uid());

-- ── rubricas_folha: remove só a policy legada; a correta já coexiste ───
DROP POLICY IF EXISTS "Authenticated can read rubricas_folha" ON public.rubricas_folha;
