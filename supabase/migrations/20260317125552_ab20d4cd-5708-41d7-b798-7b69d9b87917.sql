
-- =============================================
-- 1. TRIGGERS ESSENCIAIS
-- =============================================

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

DROP TRIGGER IF EXISTS trg_consolidar_batidas ON public.batidas_ponto;
CREATE TRIGGER trg_consolidar_batidas
  AFTER INSERT OR UPDATE ON public.batidas_ponto
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_consolidar_batidas();

-- updated_at triggers
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'admissao_tokens','admissoes','afastamentos','anotacoes_colaborador','asos',
    'banco_horas_config','beneficios','beneficios_colaborador','campos_customizados',
    'cargos','centros_custo','ciclos_avaliacao','colaboradores','competencias_matriz',
    'configuracoes','configuracoes_intervalo','contas_bancarias','contatos_emergencia',
    'contratos','departamentos','documento_templates','documentos','documentos_admissao',
    'documentos_assinatura','documentos_colaborador','empresas','epis','escalas',
    'escalas_trabalho','esocial_eventos','esocial_lotes','ferias','ferias_coletivas',
    'ferias_solicitacoes','folhas_pagamento','historico_contratos','historico_salarial',
    'integracoes','jornadas','locais_trabalho','lotacoes','metas_okrs','notificacoes',
    'onboarding_templates','pdis','periodos_ponto','pesquisas','planos_saude',
    'profiles','registros_ponto','relatorios_agendados','seguros_vida','times',
    'treinamentos','trilhas_aprendizado','turnos','webhooks','webhooks_config',
    'workflows_definicoes','workflows_execucoes'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- Audit triggers
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'colaboradores','admissoes','desligamentos','ferias','folhas_pagamento',
    'afastamentos','beneficios','registros_ponto','departamentos','cargos'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%s ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER audit_%s AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_audit_change()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- =============================================
-- 2. CORRIGIR RLS — TENANT ISOLATION
-- =============================================

-- admissoes
DROP POLICY IF EXISTS "Authenticated users can view admissoes" ON public.admissoes;
DROP POLICY IF EXISTS "Authenticated users can insert admissoes" ON public.admissoes;
DROP POLICY IF EXISTS "Authenticated users can update admissoes" ON public.admissoes;
DROP POLICY IF EXISTS "Authenticated users can delete admissoes" ON public.admissoes;

CREATE POLICY "tenant_admissoes_select" ON public.admissoes FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY "tenant_admissoes_insert" ON public.admissoes FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY "tenant_admissoes_update" ON public.admissoes FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY "tenant_admissoes_delete" ON public.admissoes FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- desligamentos
DROP POLICY IF EXISTS "Authenticated users can view desligamentos" ON public.desligamentos;
DROP POLICY IF EXISTS "Authenticated users can insert desligamentos" ON public.desligamentos;
DROP POLICY IF EXISTS "Authenticated users can update desligamentos" ON public.desligamentos;
DROP POLICY IF EXISTS "Authenticated users can delete desligamentos" ON public.desligamentos;

CREATE POLICY "tenant_desligamentos_select" ON public.desligamentos FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY "tenant_desligamentos_insert" ON public.desligamentos FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY "tenant_desligamentos_update" ON public.desligamentos FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY "tenant_desligamentos_delete" ON public.desligamentos FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- documento_templates
DROP POLICY IF EXISTS "Authenticated users can manage documento_templates" ON public.documento_templates;
CREATE POLICY "tenant_documento_templates" ON public.documento_templates FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- documentos_assinatura
DROP POLICY IF EXISTS "Authenticated users can view documentos_assinatura" ON public.documentos_assinatura;
DROP POLICY IF EXISTS "Authenticated users can insert documentos_assinatura" ON public.documentos_assinatura;
DROP POLICY IF EXISTS "Authenticated users can update documentos_assinatura" ON public.documentos_assinatura;
CREATE POLICY "tenant_documentos_assinatura" ON public.documentos_assinatura FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- onboarding_templates
DROP POLICY IF EXISTS "Authenticated users can manage onboarding_templates" ON public.onboarding_templates;
CREATE POLICY "tenant_onboarding_templates" ON public.onboarding_templates FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- relatorios_agendados
DROP POLICY IF EXISTS "Usuários autenticados podem ver agendamentos" ON public.relatorios_agendados;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir agendamentos" ON public.relatorios_agendados;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar agendamentos" ON public.relatorios_agendados;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar agendamentos" ON public.relatorios_agendados;
CREATE POLICY "tenant_relatorios_agendados" ON public.relatorios_agendados FOR ALL TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- auditoria (empresa_id é TEXT, precisa cast)
DROP POLICY IF EXISTS "Authenticated users can read auditoria" ON public.auditoria;
DROP POLICY IF EXISTS "Authenticated users can insert auditoria" ON public.auditoria;
CREATE POLICY "tenant_auditoria_select" ON public.auditoria FOR SELECT TO authenticated
  USING (empresa_id::uuid IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY "tenant_auditoria_insert" ON public.auditoria FOR INSERT TO authenticated
  WITH CHECK (empresa_id::uuid IN (SELECT public.get_user_empresas(auth.uid())));

-- =============================================
-- 3. ÍNDICES DE PERFORMANCE
-- =============================================

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'afastamentos','asos','banco_horas','banco_horas_config','batidas_ponto',
    'beneficios','campos_customizados','canal_etica','cargos','catalogo_cursos',
    'centros_custo','ciclos_avaliacao','competencias_matriz','comunicados',
    'configuracoes_intervalo','contas_bancarias','contratos','controle_acesso',
    'convenios','dados_estagiario','dctfweb_declaracoes','departamentos',
    'desligamentos','despesas','documento_templates','documentos_assinatura',
    'epis','epis_entregas','escalas','escalas_trabalho','esocial_eventos',
    'esocial_lotes','faltas','feedbacks_360','feriados','ferias',
    'ferias_coletivas','ferias_solicitacoes','folhas_pagamento','guias_fgts',
    'guias_inss','historico_contratos','historico_salarial','inscricoes_cursos',
    'jornadas','lgpd_consentimentos','lgpd_solicitacoes','locais_trabalho',
    'lotacoes','medidas_disciplinares','metas_okrs','notificacoes',
    'onboarding_templates','pdis','pesquisas','planos_saude','registros_ponto',
    'relatorios_agendados','sefip_arquivos','seguros_vida',
    'solicitacoes_hora_extra','times','treinamentos','trilhas_aprendizado',
    'turnos','vales_alimentacao','webhooks','webhooks_config',
    'workflows_definicoes','workflows_execucoes'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_empresa_id ON public.%I (empresa_id)', tbl, tbl);
  END LOOP;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'afastamentos','ajustes_ponto','anotacoes_colaborador','asos','banco_horas',
    'batidas_ponto','beneficiarios_plano','beneficiarios_seguro','beneficios',
    'beneficios_colaborador','colaborador_beneficios','contas_bancarias',
    'contatos_emergencia','contratos','controle_acesso','convenios_colaboradores',
    'dados_estagiario','dados_estrangeiro','deficiencias','dependentes',
    'desligamentos','despesas','documentos','documentos_colaborador',
    'documentos_pessoais_arquivos','epis_entregas','escalas_trabalho',
    'eventos_variaveis','exames','faltas','ferias','ferias_solicitacoes',
    'formacoes_academicas','historico_cargo','historico_contratos',
    'historico_salarial','holerites','inscricoes_cursos','lgpd_consentimentos',
    'lgpd_solicitacoes','lotacoes','medidas_disciplinares','metas_okrs',
    'onboarding_colaborador','pdis','pensoes','periodos_aquisitivos',
    'periodos_experiencia','pesquisas_respostas','planos_saude','promocoes',
    'recargas_vale','registros_ponto','seguros_colaboradores','seguros_vida',
    'sinistros_seguro','solicitacoes_hora_extra','transferencias',
    'treinamento_participantes','vales_alimentacao','vales_transporte',
    'valores_campos_customizados','vinculos'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_colaborador_id ON public.%I (colaborador_id)', tbl, tbl);
  END LOOP;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_registros_ponto_colab_data ON public.registros_ponto (colaborador_id, data);
CREATE INDEX IF NOT EXISTS idx_batidas_ponto_colab_data ON public.batidas_ponto (colaborador_id, data);
CREATE INDEX IF NOT EXISTS idx_ferias_colab_status ON public.ferias (colaborador_id, status);
CREATE INDEX IF NOT EXISTS idx_afastamentos_colab_status ON public.afastamentos (colaborador_id, status);
CREATE INDEX IF NOT EXISTS idx_folhas_pagamento_empresa_competencia ON public.folhas_pagamento (empresa_id, competencia);
