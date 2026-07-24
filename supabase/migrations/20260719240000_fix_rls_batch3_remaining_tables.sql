-- =============================================================================
-- BATCH 3 — Fix USING(true) RLS Policies for Remaining Tenant-Scoped Tables
-- =============================================================================
-- Covers all tables still using insecure USING(true) / FOR ALL USING(true)
-- policies that expose one tenant's data to any authenticated user.
--
-- Scope patterns used:
--   A) Direct empresa_id  → rls_tenant_or_admin(empresa_id)
--   B) Via colaborador_id → colaborador_id IN (SELECT id FROM colaboradores
--                            WHERE empresa_id = ANY(get_user_empresa_ids()))
--   C) Junction table     → parent_id IN (SELECT id FROM parent_table
--                            WHERE <scope condition>)
--   D) User-scoped        → user_id = auth.uid() OR is_admin(auth.uid())
-- =============================================================================

-- Ensure helper is present (idempotent — no-op if already defined)
CREATE OR REPLACE FUNCTION public.rls_tenant_or_admin(row_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_belongs_to_empresa(auth.uid(), row_empresa_id)
      OR public.is_admin(auth.uid());
$$;

-- ============================================================
-- PATTERN A — Tables with direct empresa_id
-- ============================================================

-- 1. historico_salarial
DROP POLICY IF EXISTS "Authenticated users can manage historico_salarial" ON public.historico_salarial;
DROP POLICY IF EXISTS "historico_salarial_tenant" ON public.historico_salarial;
CREATE POLICY "historico_salarial_tenant" ON public.historico_salarial
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 2. times
DROP POLICY IF EXISTS "Authenticated users can manage times" ON public.times;
DROP POLICY IF EXISTS "times_tenant" ON public.times;
CREATE POLICY "times_tenant" ON public.times
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 3. campos_customizados
DROP POLICY IF EXISTS "Auth manage campos_customizados" ON public.campos_customizados;
DROP POLICY IF EXISTS "campos_customizados_tenant" ON public.campos_customizados;
CREATE POLICY "campos_customizados_tenant" ON public.campos_customizados
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 4. webhooks_config
DROP POLICY IF EXISTS "Auth manage webhooks_config" ON public.webhooks_config;
DROP POLICY IF EXISTS "webhooks_config_tenant" ON public.webhooks_config;
CREATE POLICY "webhooks_config_tenant" ON public.webhooks_config
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 5. ferias_coletivas
DROP POLICY IF EXISTS "Auth manage ferias_coletivas" ON public.ferias_coletivas;
DROP POLICY IF EXISTS "ferias_coletivas_tenant" ON public.ferias_coletivas;
CREATE POLICY "ferias_coletivas_tenant" ON public.ferias_coletivas
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 6. lotacoes
DROP POLICY IF EXISTS "Auth users manage lotacoes" ON public.lotacoes;
DROP POLICY IF EXISTS "lotacoes_tenant" ON public.lotacoes;
CREATE POLICY "lotacoes_tenant" ON public.lotacoes
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 7. jornadas
DROP POLICY IF EXISTS "Auth users manage jornadas" ON public.jornadas;
DROP POLICY IF EXISTS "jornadas_tenant" ON public.jornadas;
CREATE POLICY "jornadas_tenant" ON public.jornadas
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 8. dctfweb_declaracoes
DROP POLICY IF EXISTS "Auth users manage dctfweb" ON public.dctfweb_declaracoes;
DROP POLICY IF EXISTS "dctfweb_declaracoes_tenant" ON public.dctfweb_declaracoes;
CREATE POLICY "dctfweb_declaracoes_tenant" ON public.dctfweb_declaracoes
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 9. contratos
DROP POLICY IF EXISTS "Auth users manage contratos" ON public.contratos;
DROP POLICY IF EXISTS "contratos_tenant" ON public.contratos;
CREATE POLICY "contratos_tenant" ON public.contratos
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 10. comunicados
DROP POLICY IF EXISTS "Auth users manage comunicados" ON public.comunicados;
DROP POLICY IF EXISTS "comunicados_tenant" ON public.comunicados;
CREATE POLICY "comunicados_tenant" ON public.comunicados
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 11. seguros_vida
DROP POLICY IF EXISTS "Auth users manage seguros_vida" ON public.seguros_vida;
DROP POLICY IF EXISTS "seguros_vida_tenant" ON public.seguros_vida;
CREATE POLICY "seguros_vida_tenant" ON public.seguros_vida
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 12. planos_saude
DROP POLICY IF EXISTS "Auth users manage planos_saude" ON public.planos_saude;
DROP POLICY IF EXISTS "planos_saude_tenant" ON public.planos_saude;
CREATE POLICY "planos_saude_tenant" ON public.planos_saude
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 13. pensoes (empresa_id added by migrations from 2025-12-28)
DROP POLICY IF EXISTS "Auth users manage pensoes" ON public.pensoes;
DROP POLICY IF EXISTS "pensoes_tenant" ON public.pensoes;
CREATE POLICY "pensoes_tenant" ON public.pensoes
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 14. ferias_solicitacoes
DROP POLICY IF EXISTS "Auth users manage ferias_solicitacoes" ON public.ferias_solicitacoes;
DROP POLICY IF EXISTS "ferias_solicitacoes_tenant" ON public.ferias_solicitacoes;
CREATE POLICY "ferias_solicitacoes_tenant" ON public.ferias_solicitacoes
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 15. asos
DROP POLICY IF EXISTS "Auth manage asos" ON public.asos;
DROP POLICY IF EXISTS "asos_tenant" ON public.asos;
CREATE POLICY "asos_tenant" ON public.asos
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 16. documentos (empresa_id added by 20260712214642_fixup_documentos_empresa_id.sql)
DROP POLICY IF EXISTS "Auth users manage documentos" ON public.documentos;
DROP POLICY IF EXISTS "documentos_tenant" ON public.documentos;
CREATE POLICY "documentos_tenant" ON public.documentos
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 17. workflows_definicoes
DROP POLICY IF EXISTS "auth_workflows_def_all" ON public.workflows_definicoes;
DROP POLICY IF EXISTS "workflows_definicoes_tenant" ON public.workflows_definicoes;
CREATE POLICY "workflows_definicoes_tenant" ON public.workflows_definicoes
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 18. turnos
DROP POLICY IF EXISTS "auth_turnos_all" ON public.turnos;
DROP POLICY IF EXISTS "turnos_tenant" ON public.turnos;
CREATE POLICY "turnos_tenant" ON public.turnos
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 19. escalas_trabalho
DROP POLICY IF EXISTS "auth_escalas_trabalho_all" ON public.escalas_trabalho;
DROP POLICY IF EXISTS "escalas_trabalho_tenant" ON public.escalas_trabalho;
CREATE POLICY "escalas_trabalho_tenant" ON public.escalas_trabalho
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 20. trilhas_aprendizado
DROP POLICY IF EXISTS "auth_trilhas_all" ON public.trilhas_aprendizado;
DROP POLICY IF EXISTS "trilhas_aprendizado_tenant" ON public.trilhas_aprendizado;
CREATE POLICY "trilhas_aprendizado_tenant" ON public.trilhas_aprendizado
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 21. sst_cat
DROP POLICY IF EXISTS "Gestores de RH podem ver CATs" ON public.sst_cat;
DROP POLICY IF EXISTS "sst_cat_tenant" ON public.sst_cat;
CREATE POLICY "sst_cat_tenant" ON public.sst_cat
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 22. ponto_regras_aprovacao
DROP POLICY IF EXISTS "Gestores podem gerenciar regras" ON public.ponto_regras_aprovacao;
DROP POLICY IF EXISTS "ponto_regras_aprovacao_tenant" ON public.ponto_regras_aprovacao;
CREATE POLICY "ponto_regras_aprovacao_tenant" ON public.ponto_regras_aprovacao
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 23. premiacoes_campanhas
DROP POLICY IF EXISTS "Permissive access for rewards" ON public.premiacoes_campanhas;
DROP POLICY IF EXISTS "premiacoes_campanhas_tenant" ON public.premiacoes_campanhas;
CREATE POLICY "premiacoes_campanhas_tenant" ON public.premiacoes_campanhas
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- 24. pesquisas
DROP POLICY IF EXISTS "auth_pesquisas_all" ON public.pesquisas;
DROP POLICY IF EXISTS "pesquisas_tenant" ON public.pesquisas;
CREATE POLICY "pesquisas_tenant" ON public.pesquisas
  FOR ALL TO authenticated
  USING  (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ============================================================
-- PATTERN B — Tables with only colaborador_id
-- ============================================================

-- 25. contatos_emergencia
DROP POLICY IF EXISTS "Authenticated users can manage contatos_emergencia" ON public.contatos_emergencia;
DROP POLICY IF EXISTS "contatos_emergencia_tenant" ON public.contatos_emergencia;
CREATE POLICY "contatos_emergencia_tenant" ON public.contatos_emergencia
  FOR ALL TO authenticated
  USING (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 26. periodos_experiencia
DROP POLICY IF EXISTS "Auth manage periodos_experiencia" ON public.periodos_experiencia;
DROP POLICY IF EXISTS "periodos_experiencia_tenant" ON public.periodos_experiencia;
CREATE POLICY "periodos_experiencia_tenant" ON public.periodos_experiencia
  FOR ALL TO authenticated
  USING (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 27. formacoes_academicas
DROP POLICY IF EXISTS "Auth manage formacoes" ON public.formacoes_academicas;
DROP POLICY IF EXISTS "formacoes_academicas_tenant" ON public.formacoes_academicas;
CREATE POLICY "formacoes_academicas_tenant" ON public.formacoes_academicas
  FOR ALL TO authenticated
  USING (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 28. dados_estrangeiro
DROP POLICY IF EXISTS "Auth manage dados_estrangeiro" ON public.dados_estrangeiro;
DROP POLICY IF EXISTS "dados_estrangeiro_tenant" ON public.dados_estrangeiro;
CREATE POLICY "dados_estrangeiro_tenant" ON public.dados_estrangeiro
  FOR ALL TO authenticated
  USING (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 29. deficiencias
DROP POLICY IF EXISTS "Auth manage deficiencias" ON public.deficiencias;
DROP POLICY IF EXISTS "deficiencias_tenant" ON public.deficiencias;
CREATE POLICY "deficiencias_tenant" ON public.deficiencias
  FOR ALL TO authenticated
  USING (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 30. anotacoes_colaborador
DROP POLICY IF EXISTS "Auth manage anotacoes" ON public.anotacoes_colaborador;
DROP POLICY IF EXISTS "anotacoes_colaborador_tenant" ON public.anotacoes_colaborador;
CREATE POLICY "anotacoes_colaborador_tenant" ON public.anotacoes_colaborador
  FOR ALL TO authenticated
  USING (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 31. exames
DROP POLICY IF EXISTS "Auth users manage exames" ON public.exames;
DROP POLICY IF EXISTS "exames_tenant" ON public.exames;
CREATE POLICY "exames_tenant" ON public.exames
  FOR ALL TO authenticated
  USING (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 32. vales_transporte
DROP POLICY IF EXISTS "Auth users manage vales_transporte" ON public.vales_transporte;
DROP POLICY IF EXISTS "vales_transporte_tenant" ON public.vales_transporte;
CREATE POLICY "vales_transporte_tenant" ON public.vales_transporte
  FOR ALL TO authenticated
  USING (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 33. promocoes (only colaborador_id)
DROP POLICY IF EXISTS "Auth users manage promocoes" ON public.promocoes;
DROP POLICY IF EXISTS "promocoes_tenant" ON public.promocoes;
CREATE POLICY "promocoes_tenant" ON public.promocoes
  FOR ALL TO authenticated
  USING (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 34. controle_acesso
DROP POLICY IF EXISTS "auth_controle_acesso_all" ON public.controle_acesso;
DROP POLICY IF EXISTS "controle_acesso_tenant" ON public.controle_acesso;
CREATE POLICY "controle_acesso_tenant" ON public.controle_acesso
  FOR ALL TO authenticated
  USING (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 35. lgpd_consentimentos
DROP POLICY IF EXISTS "auth_lgpd_consentimentos_all" ON public.lgpd_consentimentos;
DROP POLICY IF EXISTS "lgpd_consentimentos_tenant" ON public.lgpd_consentimentos;
CREATE POLICY "lgpd_consentimentos_tenant" ON public.lgpd_consentimentos
  FOR ALL TO authenticated
  USING (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 36. lgpd_solicitacoes
DROP POLICY IF EXISTS "auth_lgpd_solicitacoes_all" ON public.lgpd_solicitacoes;
DROP POLICY IF EXISTS "lgpd_solicitacoes_tenant" ON public.lgpd_solicitacoes;
CREATE POLICY "lgpd_solicitacoes_tenant" ON public.lgpd_solicitacoes
  FOR ALL TO authenticated
  USING (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 37. despesas
DROP POLICY IF EXISTS "auth_despesas_all" ON public.despesas;
DROP POLICY IF EXISTS "despesas_tenant" ON public.despesas;
CREATE POLICY "despesas_tenant" ON public.despesas
  FOR ALL TO authenticated
  USING (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 38. inscricoes_cursos
DROP POLICY IF EXISTS "auth_inscricoes_all" ON public.inscricoes_cursos;
DROP POLICY IF EXISTS "inscricoes_cursos_tenant" ON public.inscricoes_cursos;
CREATE POLICY "inscricoes_cursos_tenant" ON public.inscricoes_cursos
  FOR ALL TO authenticated
  USING (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 39. pesquisas_respostas (via colaborador_id; anonymous entries have colaborador_id = NULL → visible to company admin only)
DROP POLICY IF EXISTS "auth_pesquisas_respostas_all" ON public.pesquisas_respostas;
DROP POLICY IF EXISTS "pesquisas_respostas_tenant" ON public.pesquisas_respostas;
CREATE POLICY "pesquisas_respostas_tenant" ON public.pesquisas_respostas
  FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR pesquisa_id IN (
      SELECT id FROM public.pesquisas
      WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
    )
  )
  WITH CHECK (
    pesquisa_id IN (
      SELECT id FROM public.pesquisas
      WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
    )
  );

-- ============================================================
-- PATTERN C — Junction / child tables
-- ============================================================

-- 40. valores_campos_customizados → via campos_customizados.empresa_id
DROP POLICY IF EXISTS "Auth manage valores_campos" ON public.valores_campos_customizados;
DROP POLICY IF EXISTS "valores_campos_customizados_tenant" ON public.valores_campos_customizados;
CREATE POLICY "valores_campos_customizados_tenant" ON public.valores_campos_customizados
  FOR ALL TO authenticated
  USING (campo_customizado_id IN (
    SELECT id FROM public.campos_customizados
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (campo_customizado_id IN (
    SELECT id FROM public.campos_customizados
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 41. webhooks_logs → via webhooks_config.empresa_id
DROP POLICY IF EXISTS "Auth manage webhooks_logs" ON public.webhooks_logs;
DROP POLICY IF EXISTS "webhooks_logs_tenant" ON public.webhooks_logs;
CREATE POLICY "webhooks_logs_tenant" ON public.webhooks_logs
  FOR ALL TO authenticated
  USING (webhook_id IN (
    SELECT id FROM public.webhooks_config
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (webhook_id IN (
    SELECT id FROM public.webhooks_config
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 42. beneficiarios_plano → via colaborador_id → colaboradores.empresa_id
DROP POLICY IF EXISTS "Auth users manage beneficiarios_plano" ON public.beneficiarios_plano;
DROP POLICY IF EXISTS "beneficiarios_plano_tenant" ON public.beneficiarios_plano;
CREATE POLICY "beneficiarios_plano_tenant" ON public.beneficiarios_plano
  FOR ALL TO authenticated
  USING (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 43. linhas_transporte → via vales_transporte.colaborador_id → colaboradores.empresa_id
DROP POLICY IF EXISTS "Auth users manage linhas_transporte" ON public.linhas_transporte;
DROP POLICY IF EXISTS "linhas_transporte_tenant" ON public.linhas_transporte;
CREATE POLICY "linhas_transporte_tenant" ON public.linhas_transporte
  FOR ALL TO authenticated
  USING (vale_transporte_id IN (
    SELECT vt.id FROM public.vales_transporte vt
    JOIN public.colaboradores c ON c.id = vt.colaborador_id
    WHERE c.empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (vale_transporte_id IN (
    SELECT vt.id FROM public.vales_transporte vt
    JOIN public.colaboradores c ON c.id = vt.colaborador_id
    WHERE c.empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 44. trilhas_cursos → via trilhas_aprendizado.empresa_id
DROP POLICY IF EXISTS "auth_trilhas_cursos_all" ON public.trilhas_cursos;
DROP POLICY IF EXISTS "trilhas_cursos_tenant" ON public.trilhas_cursos;
CREATE POLICY "trilhas_cursos_tenant" ON public.trilhas_cursos
  FOR ALL TO authenticated
  USING (trilha_id IN (
    SELECT id FROM public.trilhas_aprendizado
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (trilha_id IN (
    SELECT id FROM public.trilhas_aprendizado
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 45. pesquisas_perguntas → via pesquisas.empresa_id
DROP POLICY IF EXISTS "auth_pesquisas_perguntas_all" ON public.pesquisas_perguntas;
DROP POLICY IF EXISTS "pesquisas_perguntas_tenant" ON public.pesquisas_perguntas;
CREATE POLICY "pesquisas_perguntas_tenant" ON public.pesquisas_perguntas
  FOR ALL TO authenticated
  USING (pesquisa_id IN (
    SELECT id FROM public.pesquisas
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (pesquisa_id IN (
    SELECT id FROM public.pesquisas
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 46. comunicados_leituras → via comunicados.empresa_id
DROP POLICY IF EXISTS "auth_comunicados_leituras_all" ON public.comunicados_leituras;
DROP POLICY IF EXISTS "comunicados_leituras_tenant" ON public.comunicados_leituras;
CREATE POLICY "comunicados_leituras_tenant" ON public.comunicados_leituras
  FOR ALL TO authenticated
  USING (comunicado_id IN (
    SELECT id FROM public.comunicados
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (comunicado_id IN (
    SELECT id FROM public.comunicados
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 47. holerites → via colaborador_id → colaboradores.empresa_id
DROP POLICY IF EXISTS "Authenticated users can manage holerites" ON public.holerites;
DROP POLICY IF EXISTS "holerites_tenant" ON public.holerites;
CREATE POLICY "holerites_tenant" ON public.holerites
  FOR ALL TO authenticated
  USING (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (colaborador_id IN (
    SELECT id FROM public.colaboradores
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 48. lancamentos_folha → via holerite_id → holerites.colaborador_id → colaboradores.empresa_id
DROP POLICY IF EXISTS "Authenticated users can manage lancamentos" ON public.lancamentos_folha;
DROP POLICY IF EXISTS "lancamentos_folha_tenant" ON public.lancamentos_folha;
CREATE POLICY "lancamentos_folha_tenant" ON public.lancamentos_folha
  FOR ALL TO authenticated
  USING (holerite_id IN (
    SELECT h.id FROM public.holerites h
    JOIN public.colaboradores c ON c.id = h.colaborador_id
    WHERE c.empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (holerite_id IN (
    SELECT h.id FROM public.holerites h
    JOIN public.colaboradores c ON c.id = h.colaborador_id
    WHERE c.empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 49. workflows_etapas → via workflows_definicoes.empresa_id
DROP POLICY IF EXISTS "auth_workflows_etapas_all" ON public.workflows_etapas;
DROP POLICY IF EXISTS "workflows_etapas_tenant" ON public.workflows_etapas;
CREATE POLICY "workflows_etapas_tenant" ON public.workflows_etapas
  FOR ALL TO authenticated
  USING (workflow_id IN (
    SELECT id FROM public.workflows_definicoes
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (workflow_id IN (
    SELECT id FROM public.workflows_definicoes
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 50. workflows_execucoes → via workflows_definicoes.empresa_id
DROP POLICY IF EXISTS "auth_workflows_exec_all" ON public.workflows_execucoes;
DROP POLICY IF EXISTS "workflows_execucoes_tenant" ON public.workflows_execucoes;
CREATE POLICY "workflows_execucoes_tenant" ON public.workflows_execucoes
  FOR ALL TO authenticated
  USING (workflow_id IN (
    SELECT id FROM public.workflows_definicoes
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (workflow_id IN (
    SELECT id FROM public.workflows_definicoes
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 51. workflows_historico → via execucao_id → workflows_execucoes → workflows_definicoes.empresa_id
DROP POLICY IF EXISTS "auth_workflows_hist_all" ON public.workflows_historico;
DROP POLICY IF EXISTS "workflows_historico_tenant" ON public.workflows_historico;
CREATE POLICY "workflows_historico_tenant" ON public.workflows_historico
  FOR ALL TO authenticated
  USING (execucao_id IN (
    SELECT we.id FROM public.workflows_execucoes we
    JOIN public.workflows_definicoes wd ON wd.id = we.workflow_id
    WHERE wd.empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (execucao_id IN (
    SELECT we.id FROM public.workflows_execucoes we
    JOIN public.workflows_definicoes wd ON wd.id = we.workflow_id
    WHERE wd.empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 52. premiacoes_regras → via campanha_id → premiacoes_campanhas.empresa_id
DROP POLICY IF EXISTS "Permissive access for rewards" ON public.premiacoes_regras;
DROP POLICY IF EXISTS "premiacoes_regras_tenant" ON public.premiacoes_regras;
CREATE POLICY "premiacoes_regras_tenant" ON public.premiacoes_regras
  FOR ALL TO authenticated
  USING (campanha_id IN (
    SELECT id FROM public.premiacoes_campanhas
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (campanha_id IN (
    SELECT id FROM public.premiacoes_campanhas
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 53. premiacoes_pagamentos → via campanha_id → premiacoes_campanhas.empresa_id
DROP POLICY IF EXISTS "Permissive access for rewards" ON public.premiacoes_pagamentos;
DROP POLICY IF EXISTS "premiacoes_pagamentos_tenant" ON public.premiacoes_pagamentos;
CREATE POLICY "premiacoes_pagamentos_tenant" ON public.premiacoes_pagamentos
  FOR ALL TO authenticated
  USING (campanha_id IN (
    SELECT id FROM public.premiacoes_campanhas
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ))
  WITH CHECK (campanha_id IN (
    SELECT id FROM public.premiacoes_campanhas
    WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
  ));

-- 54. premiacoes_auditoria → audit log tied to user_id; admins can see all
DROP POLICY IF EXISTS "Permissive access for rewards" ON public.premiacoes_auditoria;
DROP POLICY IF EXISTS "premiacoes_auditoria_tenant" ON public.premiacoes_auditoria;
CREATE POLICY "premiacoes_auditoria_tenant" ON public.premiacoes_auditoria
  FOR ALL TO authenticated
  USING  (usuario_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (usuario_id = auth.uid() OR public.is_admin(auth.uid()));

-- 55. premiacoes_roi_cenarios → personal ROI scenario, owned by creating user
DROP POLICY IF EXISTS "Permissive access for rewards" ON public.premiacoes_roi_cenarios;
DROP POLICY IF EXISTS "premiacoes_roi_cenarios_tenant" ON public.premiacoes_roi_cenarios;
CREATE POLICY "premiacoes_roi_cenarios_tenant" ON public.premiacoes_roi_cenarios
  FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- =============================================================================
-- Ensure RLS is enabled on all affected tables (idempotent)
-- =============================================================================
ALTER TABLE public.historico_salarial         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.times                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campos_customizados         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks_config             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferias_coletivas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotacoes                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jornadas                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dctfweb_declaracoes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seguros_vida                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_saude                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pensoes                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ferias_solicitacoes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asos                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows_definicoes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnos                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalas_trabalho            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trilhas_aprendizado         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sst_cat                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ponto_regras_aprovacao      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premiacoes_campanhas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesquisas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos_emergencia         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_experiencia        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formacoes_academicas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dados_estrangeiro           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deficiencias                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anotacoes_colaborador       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exames                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vales_transporte            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocoes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controle_acesso             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_consentimentos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lgpd_solicitacoes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscricoes_cursos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesquisas_respostas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valores_campos_customizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiarios_plano         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linhas_transporte           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trilhas_cursos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesquisas_perguntas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados_leituras        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holerites                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_folha           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows_etapas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows_execucoes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows_historico         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premiacoes_regras           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premiacoes_pagamentos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premiacoes_auditoria        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premiacoes_roi_cenarios     ENABLE ROW LEVEL SECURITY;
