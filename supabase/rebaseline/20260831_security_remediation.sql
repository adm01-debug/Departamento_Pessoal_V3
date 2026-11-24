-- Rebaseline 2026-08-31: fechamento dos gaps de autorização do schema canônico.
--
-- Este arquivo é aplicado sobre a cópia restaurada do projeto
-- frjbfeamybqsejlvmqbl antes da geração do squash. Ele não depende do ledger
-- histórico e deve executar dentro de uma única transação (psql -1).

-- ---------------------------------------------------------------------------
-- Helpers canônicos de autorização
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_belongs_to_empresa(
  _user_id uuid,
  _empresa_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT (_user_id = auth.uid() OR auth.uid() IS NULL)
     AND _empresa_id IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.user_empresas ue
       WHERE ue.user_id = _user_id
         AND ue.empresa_id = _empresa_id
     );
$$;

CREATE OR REPLACE FUNCTION public.pode_gerir_rh(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT auth.uid() IS NOT NULL
     AND public.pertence_a_empresa(_empresa_id)
     AND (
       public.has_role(auth.uid(), 'admin'::public.app_role)
       OR public.has_role(auth.uid(), 'gestor'::public.app_role)
       OR public.has_role(auth.uid(), 'rh'::public.app_role)
     );
$$;

-- colaboradores NÃO tem coluna user_id — o vínculo com auth.users é por
-- e-mail (mesmo padrão já usado em ferias_programacao/cnab_remessas). email
-- não é UNIQUE em colaboradores, então o match por e-mail sozinho poderia
-- cruzar tenant se dois colaboradores de empresas diferentes compartilharem
-- e-mail; por isso a filiação à empresa via user_belongs_to_empresa é
-- exigida aqui também, fechando esse cruzamento mesmo quando o e-mail colide.
CREATE OR REPLACE FUNCTION public.sou_o_colaborador(_colaborador_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.colaboradores c
       WHERE c.id = _colaborador_id
         AND c.email IS NOT NULL
         AND c.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
         AND public.user_belongs_to_empresa(auth.uid(), c.empresa_id)
     );
$$;

REVOKE ALL ON FUNCTION public.user_belongs_to_empresa(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pode_gerir_rh(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sou_o_colaborador(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_empresa(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pode_gerir_rh(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sou_o_colaborador(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.pode_gerir_rh(uuid) IS
  'Exige vínculo persistido com a empresa e papel admin, gestor ou rh.';
COMMENT ON FUNCTION public.sou_o_colaborador(uuid) IS
  'Correlaciona a linha de colaborador com auth.uid() por colaboradores.user_id.';

-- ---------------------------------------------------------------------------
-- RPCs SECURITY DEFINER: autorização interna ou somente service_role
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.next_cnab_sequencial(
  p_empresa_id uuid,
  p_banco_codigo text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_sequencial integer;
BEGIN
  IF NOT public.pode_gerir_rh(p_empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para gerar sequência CNAB desta empresa'
      USING ERRCODE = '42501';
  END IF;

  -- Serializa o cálculo por empresa+banco e elimina MAX()+1 concorrente.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_empresa_id::text || ':' || coalesce(p_banco_codigo, ''), 0)
  );

  SELECT coalesce(max(r.sequencial_arquivo), 0) + 1
    INTO v_sequencial
    FROM public.cnab_remessas r
   WHERE r.empresa_id = p_empresa_id
     AND r.banco_codigo = p_banco_codigo;

  RETURN v_sequencial;
END;
$$;

CREATE OR REPLACE FUNCTION public.processar_ajuste_aprovado(
  p_solicitacao_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_solicitacao public.solicitacoes_ajuste_ponto%ROWTYPE;
BEGIN
  SELECT *
    INTO v_solicitacao
    FROM public.solicitacoes_ajuste_ponto
   WHERE id = p_solicitacao_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada';
  END IF;
  IF NOT public.pode_gerir_rh(v_solicitacao.empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para processar ajuste desta empresa'
      USING ERRCODE = '42501';
  END IF;
  IF v_solicitacao.status <> 'aprovado' THEN
    RAISE EXCEPTION 'Apenas solicitações aprovadas podem ser processadas';
  END IF;

  INSERT INTO public.batidas_ponto (
    colaborador_id, empresa_id, data, hora, tipo, origem, ajustado,
    ajustado_por, motivo_ajuste, hash_integridade
  ) VALUES (
    v_solicitacao.colaborador_id,
    v_solicitacao.empresa_id,
    v_solicitacao.data_ponto,
    v_solicitacao.hora_sugerida,
    v_solicitacao.tipo_ponto,
    'ajuste_manual',
    true,
    auth.uid(),
    v_solicitacao.motivo,
    encode(digest(v_solicitacao.id::text || clock_timestamp()::text, 'sha256'), 'hex')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.next_cnab_sequencial(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.processar_ajuste_aprovado(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_cnab_sequencial(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.processar_ajuste_aprovado(uuid) TO authenticated, service_role;

-- Funções internas, de trigger ou cron nunca devem ser RPCs de navegador.
DO $$
DECLARE
  r record;
  internal_names text[] := ARRAY[
    'gerar_rubricas_ferias',
    'get_colaborador_banco_horas',
    'is_country_allowed',
    'is_ip_blocked',
    'is_ip_whitelisted',
    'reset_login_attempts',
    'validate_ponto_compliance',
    'anonimizar_dados_pessoais',
    'check_brute_force',
    'calcular_prazo_cat',
    'check_rate_limit',
    'fn_link_gov_br_account',
    'reconciliar_ferias_folha_batch',
    'enforce_desligamento_hash'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(internal_names)
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      r.signature
    );
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.signature);
  END LOOP;
END;
$$;

-- Dependências de extensões precisam permanecer alcançáveis no search_path.
ALTER FUNCTION public.sst_regimento_assinar(uuid, uuid, text, text)
  SET search_path = public, extensions, pg_catalog;

-- ---------------------------------------------------------------------------
-- Tabelas trabalhistas sensíveis: papel para gestão, autoacesso só leitura
-- (e escrita apenas nos dois cadastros de autosserviço explicitamente aceitos).
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r record;
  sensitive_tables text[] := ARRAY[
    'adiantamentos_salariais', 'afastamentos', 'anotacoes_colaborador',
    'asos', 'beneficiarios_plano', 'canal_etica', 'cnab_itens',
    'colaboradores', 'contas_bancarias', 'contatos_emergencia',
    'dependentes', 'desligamentos', 'documentos_colaborador',
    'documentos_pessoais_arquivos', 'emprestimos_consignados', 'exames',
    'ferias', 'folha_itens', 'folhas_pagamento', 'formacoes_academicas',
    'historico_rescisoes', 'historico_salarial', 'holerites',
    'lancamentos_folha', 'lgpd_solicitacoes', 'medidas_disciplinares',
    'pix_itens'
  ];
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY(sensitive_tables)
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END;
$$;

-- Relações com empresa_id direto e sem autoacesso individual.
CREATE POLICY adiantamentos_rh_all ON public.adiantamentos_salariais
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY emprestimos_rh_all ON public.emprestimos_consignados
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY folhas_pagamento_rh_all ON public.folhas_pagamento
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY historico_rescisoes_rh_all ON public.historico_rescisoes
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

-- Colaborador: RH administra; a pessoa lê apenas o próprio cadastro.
CREATE POLICY colaboradores_rh_all ON public.colaboradores
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY colaboradores_self_select ON public.colaboradores
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(id));

-- Tabelas com empresa_id e colaborador_id.
CREATE POLICY contas_bancarias_rh_all ON public.contas_bancarias
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY contas_bancarias_self_select ON public.contas_bancarias
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

CREATE POLICY afastamentos_rh_all ON public.afastamentos
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY afastamentos_self_select ON public.afastamentos
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

CREATE POLICY asos_rh_all ON public.asos
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY asos_self_select ON public.asos
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

CREATE POLICY desligamentos_rh_all ON public.desligamentos
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY desligamentos_self_select ON public.desligamentos
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

CREATE POLICY ferias_rh_all ON public.ferias
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY ferias_self_select ON public.ferias
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

CREATE POLICY historico_salarial_rh_all ON public.historico_salarial
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY historico_salarial_self_select ON public.historico_salarial
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

CREATE POLICY lgpd_solicitacoes_rh_all ON public.lgpd_solicitacoes
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY lgpd_solicitacoes_self_select ON public.lgpd_solicitacoes
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

CREATE POLICY medidas_disciplinares_rh_all ON public.medidas_disciplinares
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY medidas_disciplinares_self_select ON public.medidas_disciplinares
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

CREATE POLICY canal_etica_rh_all ON public.canal_etica
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

-- Tabelas filhas cujo tenant é derivado de colaboradores.
CREATE POLICY dependentes_rh_all ON public.dependentes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = dependentes.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = dependentes.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ));
CREATE POLICY dependentes_self_select ON public.dependentes
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

CREATE POLICY documentos_colaborador_rh_all ON public.documentos_colaborador
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = documentos_colaborador.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = documentos_colaborador.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ));
CREATE POLICY documentos_colaborador_self_select ON public.documentos_colaborador
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

CREATE POLICY documentos_pessoais_rh_all ON public.documentos_pessoais_arquivos
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = documentos_pessoais_arquivos.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = documentos_pessoais_arquivos.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ));
CREATE POLICY documentos_pessoais_self_select ON public.documentos_pessoais_arquivos
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

CREATE POLICY exames_rh_all ON public.exames
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = exames.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = exames.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ));
CREATE POLICY exames_self_select ON public.exames
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

CREATE POLICY beneficiarios_plano_rh_all ON public.beneficiarios_plano
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = beneficiarios_plano.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = beneficiarios_plano.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ));
CREATE POLICY beneficiarios_plano_self_select ON public.beneficiarios_plano
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

CREATE POLICY anotacoes_colaborador_rh_all ON public.anotacoes_colaborador
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = anotacoes_colaborador.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = anotacoes_colaborador.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ));

CREATE POLICY contatos_emergencia_rh_all ON public.contatos_emergencia
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = contatos_emergencia.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = contatos_emergencia.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ));
CREATE POLICY contatos_emergencia_self_all ON public.contatos_emergencia
  FOR ALL TO authenticated
  USING (public.sou_o_colaborador(colaborador_id))
  WITH CHECK (public.sou_o_colaborador(colaborador_id));

CREATE POLICY formacoes_academicas_rh_all ON public.formacoes_academicas
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = formacoes_academicas.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = formacoes_academicas.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ));
CREATE POLICY formacoes_academicas_self_all ON public.formacoes_academicas
  FOR ALL TO authenticated
  USING (public.sou_o_colaborador(colaborador_id))
  WITH CHECK (public.sou_o_colaborador(colaborador_id));

CREATE POLICY holerites_rh_all ON public.holerites
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = holerites.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = holerites.colaborador_id
      AND public.pode_gerir_rh(c.empresa_id)
  ));
CREATE POLICY holerites_self_select ON public.holerites
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

CREATE POLICY folha_itens_rh_all ON public.folha_itens
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.folhas_pagamento f
    WHERE f.id = folha_itens.folha_id
      AND public.pode_gerir_rh(f.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.folhas_pagamento f
    WHERE f.id = folha_itens.folha_id
      AND public.pode_gerir_rh(f.empresa_id)
  ));
CREATE POLICY folha_itens_self_select ON public.folha_itens
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));

CREATE POLICY lancamentos_folha_rh_all ON public.lancamentos_folha
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.holerites h
    JOIN public.colaboradores c ON c.id = h.colaborador_id
    WHERE h.id = lancamentos_folha.holerite_id
      AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.holerites h
    JOIN public.colaboradores c ON c.id = h.colaborador_id
    WHERE h.id = lancamentos_folha.holerite_id
      AND public.pode_gerir_rh(c.empresa_id)
  ));
CREATE POLICY lancamentos_folha_self_select ON public.lancamentos_folha
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.holerites h
    WHERE h.id = lancamentos_folha.holerite_id
      AND public.sou_o_colaborador(h.colaborador_id)
  ));

-- Arquivos bancários derivam o tenant do lote/remessa pai.
CREATE POLICY cnab_itens_rh_all ON public.cnab_itens
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cnab_remessas r
    WHERE r.id = cnab_itens.remessa_id
      AND public.pode_gerir_rh(r.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cnab_remessas r
    WHERE r.id = cnab_itens.remessa_id
      AND public.pode_gerir_rh(r.empresa_id)
  ));
CREATE POLICY pix_itens_rh_all ON public.pix_itens
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pix_lotes l
    WHERE l.id = pix_itens.lote_id
      AND public.pode_gerir_rh(l.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pix_lotes l
    WHERE l.id = pix_itens.lote_id
      AND public.pode_gerir_rh(l.empresa_id)
  ));

-- ---------------------------------------------------------------------------
-- Dez políticas multi-tenant residuais detectadas após o batch do Cline.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS auditoria_logs_insert ON public.auditoria_logs;

DROP POLICY IF EXISTS "Documentos historico authenticated" ON public.documentos_historico;
CREATE POLICY documentos_historico_rh_all ON public.documentos_historico
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.documentos d
    JOIN public.colaboradores c ON c.id = d.colaborador_id
    WHERE d.id = documentos_historico.documento_id
      AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.documentos d
    JOIN public.colaboradores c ON c.id = d.colaborador_id
    WHERE d.id = documentos_historico.documento_id
      AND public.pode_gerir_rh(c.empresa_id)
  ));
CREATE POLICY documentos_historico_self_select ON public.documentos_historico
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.documentos d
    WHERE d.id = documentos_historico.documento_id
      AND public.sou_o_colaborador(d.colaborador_id)
  ));

DROP POLICY IF EXISTS "Users can view system parameters" ON public.parametros_sistema;
CREATE POLICY parametros_sistema_tenant_select ON public.parametros_sistema
  FOR SELECT TO authenticated
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Premiacoes pagamentos scoped" ON public.premiacoes_pagamentos;
CREATE POLICY premiacoes_pagamentos_rh_select ON public.premiacoes_pagamentos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.premiacoes_campanhas c
    WHERE c.id = premiacoes_pagamentos.campanha_id
      AND public.pode_gerir_rh(c.empresa_id)
  ));

DROP POLICY IF EXISTS "Premiacoes regras scoped" ON public.premiacoes_regras;
CREATE POLICY premiacoes_regras_rh_select ON public.premiacoes_regras
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.premiacoes_campanhas c
    WHERE c.id = premiacoes_regras.campanha_id
      AND public.pode_gerir_rh(c.empresa_id)
  ));

DROP POLICY IF EXISTS "Authenticated can read rubricas_folha" ON public.rubricas_folha;
CREATE POLICY rubricas_folha_tenant_select ON public.rubricas_folha
  FOR SELECT TO authenticated
  USING (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));

DROP POLICY IF EXISTS "Times brindes visiveis para autenticados" ON public.times_brindes;
DROP POLICY IF EXISTS "Enable read for all" ON public.times_brindes;
CREATE POLICY times_brindes_tenant_select ON public.times_brindes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.times t
    WHERE t.id = times_brindes.time_id
      AND public.pertence_a_empresa(t.empresa_id)
  ));

DROP POLICY IF EXISTS "Treinamento feedback authenticated" ON public.treinamento_feedback;
CREATE POLICY treinamento_feedback_tenant_all ON public.treinamento_feedback
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.inscricoes_cursos i
    WHERE i.id = treinamento_feedback.inscricao_id
      AND (
        public.pode_gerir_rh(i.empresa_id)
        OR public.sou_o_colaborador(i.colaborador_id)
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.inscricoes_cursos i
    WHERE i.id = treinamento_feedback.inscricao_id
      AND (
        public.pode_gerir_rh(i.empresa_id)
        OR public.sou_o_colaborador(i.colaborador_id)
      )
  ));

DROP POLICY IF EXISTS "Treinamento instancias authenticated" ON public.treinamento_instancias;
CREATE POLICY treinamento_instancias_tenant_select ON public.treinamento_instancias
  FOR SELECT TO authenticated
  USING (public.pertence_a_empresa(empresa_id));
CREATE POLICY treinamento_instancias_rh_write ON public.treinamento_instancias
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

DROP POLICY IF EXISTS "Acesso à trilha de auditoria" ON public.trilha_auditoria_ponto;
CREATE POLICY trilha_auditoria_ponto_rh_select ON public.trilha_auditoria_ponto
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.batidas_ponto b
    WHERE b.id = trilha_auditoria_ponto.ponto_id
      AND public.pode_gerir_rh(b.empresa_id)
  ));
