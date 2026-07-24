
-- =====================================================
-- BATCH 2: Tables linked via colaborador_id
-- =====================================================

-- ajustes_ponto
DROP POLICY IF EXISTS "Authenticated users can manage ajustes_ponto" ON public.ajustes_ponto;
DROP POLICY IF EXISTS "tenant_ajustes_ponto" ON public.ajustes_ponto;
CREATE POLICY "tenant_ajustes_ponto" ON public.ajustes_ponto FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- anotacoes_colaborador
DROP POLICY IF EXISTS "Auth manage anotacoes" ON public.anotacoes_colaborador;
DROP POLICY IF EXISTS "tenant_anotacoes_colaborador" ON public.anotacoes_colaborador;
CREATE POLICY "tenant_anotacoes_colaborador" ON public.anotacoes_colaborador FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- beneficiarios_plano
DROP POLICY IF EXISTS "Auth users manage beneficiarios_plano" ON public.beneficiarios_plano;
DROP POLICY IF EXISTS "tenant_beneficiarios_plano" ON public.beneficiarios_plano;
CREATE POLICY "tenant_beneficiarios_plano" ON public.beneficiarios_plano FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- beneficiarios_seguro
DROP POLICY IF EXISTS "Auth users manage beneficiarios_seguro" ON public.beneficiarios_seguro;
DROP POLICY IF EXISTS "tenant_beneficiarios_seguro" ON public.beneficiarios_seguro;
CREATE POLICY "tenant_beneficiarios_seguro" ON public.beneficiarios_seguro FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- colaborador_beneficios
DROP POLICY IF EXISTS "Auth users manage colaborador_beneficios" ON public.colaborador_beneficios;
DROP POLICY IF EXISTS "tenant_colaborador_beneficios" ON public.colaborador_beneficios;
CREATE POLICY "tenant_colaborador_beneficios" ON public.colaborador_beneficios FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- contatos_emergencia
DROP POLICY IF EXISTS "Authenticated users can manage contatos_emergencia" ON public.contatos_emergencia;
DROP POLICY IF EXISTS "tenant_contatos_emergencia" ON public.contatos_emergencia;
CREATE POLICY "tenant_contatos_emergencia" ON public.contatos_emergencia FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- convenios_colaboradores
DROP POLICY IF EXISTS "Auth users manage convenios_colaboradores" ON public.convenios_colaboradores;
DROP POLICY IF EXISTS "tenant_convenios_colaboradores" ON public.convenios_colaboradores;
CREATE POLICY "tenant_convenios_colaboradores" ON public.convenios_colaboradores FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- dados_estrangeiro
DROP POLICY IF EXISTS "Auth manage dados_estrangeiro" ON public.dados_estrangeiro;
DROP POLICY IF EXISTS "tenant_dados_estrangeiro" ON public.dados_estrangeiro;
CREATE POLICY "tenant_dados_estrangeiro" ON public.dados_estrangeiro FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- deficiencias
DROP POLICY IF EXISTS "Auth manage deficiencias" ON public.deficiencias;
DROP POLICY IF EXISTS "tenant_deficiencias" ON public.deficiencias;
CREATE POLICY "tenant_deficiencias" ON public.deficiencias FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- dependentes
DROP POLICY IF EXISTS "Authenticated users can manage dependentes" ON public.dependentes;
DROP POLICY IF EXISTS "tenant_dependentes" ON public.dependentes;
CREATE POLICY "tenant_dependentes" ON public.dependentes FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- documentos
DROP POLICY IF EXISTS "Auth users manage documentos" ON public.documentos;
DROP POLICY IF EXISTS "tenant_documentos" ON public.documentos;
CREATE POLICY "tenant_documentos" ON public.documentos FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- documentos_colaborador
DROP POLICY IF EXISTS "Authenticated users can manage documentos" ON public.documentos_colaborador;
DROP POLICY IF EXISTS "tenant_documentos_colaborador" ON public.documentos_colaborador;
CREATE POLICY "tenant_documentos_colaborador" ON public.documentos_colaborador FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- documentos_pessoais_arquivos
DROP POLICY IF EXISTS "documentos_pessoais_auth" ON public.documentos_pessoais_arquivos;
DROP POLICY IF EXISTS "tenant_documentos_pessoais_arquivos" ON public.documentos_pessoais_arquivos;
CREATE POLICY "tenant_documentos_pessoais_arquivos" ON public.documentos_pessoais_arquivos FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- eventos_variaveis
DROP POLICY IF EXISTS "Authenticated users can manage eventos_variaveis" ON public.eventos_variaveis;
DROP POLICY IF EXISTS "tenant_eventos_variaveis" ON public.eventos_variaveis;
CREATE POLICY "tenant_eventos_variaveis" ON public.eventos_variaveis FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- exames
DROP POLICY IF EXISTS "Auth users manage exames" ON public.exames;
DROP POLICY IF EXISTS "tenant_exames" ON public.exames;
CREATE POLICY "tenant_exames" ON public.exames FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- formacoes_academicas
DROP POLICY IF EXISTS "Auth manage formacoes" ON public.formacoes_academicas;
DROP POLICY IF EXISTS "tenant_formacoes_academicas" ON public.formacoes_academicas;
CREATE POLICY "tenant_formacoes_academicas" ON public.formacoes_academicas FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- historico_cargo
DROP POLICY IF EXISTS "Authenticated users can manage historico_cargo" ON public.historico_cargo;
DROP POLICY IF EXISTS "tenant_historico_cargo" ON public.historico_cargo;
CREATE POLICY "tenant_historico_cargo" ON public.historico_cargo FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- holerites
DROP POLICY IF EXISTS "Authenticated users can manage holerites" ON public.holerites;
DROP POLICY IF EXISTS "tenant_holerites" ON public.holerites;
CREATE POLICY "tenant_holerites" ON public.holerites FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- pensoes
DROP POLICY IF EXISTS "Auth users manage pensoes" ON public.pensoes;
DROP POLICY IF EXISTS "tenant_pensoes" ON public.pensoes;
CREATE POLICY "tenant_pensoes" ON public.pensoes FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- periodos_experiencia
DROP POLICY IF EXISTS "Auth manage periodos_experiencia" ON public.periodos_experiencia;
DROP POLICY IF EXISTS "tenant_periodos_experiencia" ON public.periodos_experiencia;
CREATE POLICY "tenant_periodos_experiencia" ON public.periodos_experiencia FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- promocoes
DROP POLICY IF EXISTS "Auth users manage promocoes" ON public.promocoes;
DROP POLICY IF EXISTS "tenant_promocoes" ON public.promocoes;
CREATE POLICY "tenant_promocoes" ON public.promocoes FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- recargas_vale
DROP POLICY IF EXISTS "Auth users manage recargas_vale" ON public.recargas_vale;
DROP POLICY IF EXISTS "tenant_recargas_vale" ON public.recargas_vale;
CREATE POLICY "tenant_recargas_vale" ON public.recargas_vale FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- seguros_colaboradores
DROP POLICY IF EXISTS "Auth users manage seguros_colaboradores" ON public.seguros_colaboradores;
DROP POLICY IF EXISTS "tenant_seguros_colaboradores" ON public.seguros_colaboradores;
CREATE POLICY "tenant_seguros_colaboradores" ON public.seguros_colaboradores FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- sinistros_seguro
DROP POLICY IF EXISTS "Auth users manage sinistros_seguro" ON public.sinistros_seguro;
DROP POLICY IF EXISTS "tenant_sinistros_seguro" ON public.sinistros_seguro;
CREATE POLICY "tenant_sinistros_seguro" ON public.sinistros_seguro FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- transferencias
DROP POLICY IF EXISTS "Auth users manage transferencias" ON public.transferencias;
DROP POLICY IF EXISTS "tenant_transferencias" ON public.transferencias;
CREATE POLICY "tenant_transferencias" ON public.transferencias FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- treinamento_participantes
DROP POLICY IF EXISTS "Auth users manage treinamento_participantes" ON public.treinamento_participantes;
DROP POLICY IF EXISTS "tenant_treinamento_participantes" ON public.treinamento_participantes;
CREATE POLICY "tenant_treinamento_participantes" ON public.treinamento_participantes FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- vales_transporte
DROP POLICY IF EXISTS "Auth users manage vales_transporte" ON public.vales_transporte;
DROP POLICY IF EXISTS "tenant_vales_transporte" ON public.vales_transporte;
CREATE POLICY "tenant_vales_transporte" ON public.vales_transporte FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- valores_campos_customizados
DROP POLICY IF EXISTS "Auth manage valores_campos" ON public.valores_campos_customizados;
DROP POLICY IF EXISTS "tenant_valores_campos_customizados" ON public.valores_campos_customizados;
CREATE POLICY "tenant_valores_campos_customizados" ON public.valores_campos_customizados FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- vinculos
DROP POLICY IF EXISTS "Auth users manage vinculos" ON public.vinculos;
DROP POLICY IF EXISTS "tenant_vinculos" ON public.vinculos;
CREATE POLICY "tenant_vinculos" ON public.vinculos FOR ALL TO authenticated
  USING (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (colaborador_id IN (SELECT id FROM public.colaboradores WHERE empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));
