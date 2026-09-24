-- P0: remediação de menor privilégio em RLS — fecha as 29 violações apontadas
-- por scripts/audit-rls-least-privilege.mjs em ~20 tabelas sensíveis. Antes
-- desta migração, a maioria dessas tabelas só tinha escopo de tenant
-- (empresa_id), sem checagem de papel: qualquer colaborador autenticado da
-- empresa (estagiário incluído) conseguia ler/gravar dados de RH de
-- qualquer colega. Também corrige 2 bugs reais encontrados durante a
-- auditoria (adiantamentos_salariais e emprestimos_consignados com
-- `empresa_id IN (SELECT id FROM empresas)` — sem tenant scope nenhum,
-- cross-tenant total).
--
-- sou_o_colaborador() é redefinida do zero: a versão de uma migração de
-- julho/2026 nunca chegou a ser aplicada em produção e dependia de
-- colaboradores.user_id, coluna que não existe (colaboradores.id = auth.uid()
-- é a convenção real, já usada pelas policies de leitura própria de
-- documentos_colaborador/holerites).

CREATE OR REPLACE FUNCTION public.sou_o_colaborador(_colaborador_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public, extensions, pg_temp
AS $$
  SELECT _colaborador_id = auth.uid();
$$;

-- historico_rescisoes: self-insert por created_by não faz sentido para um
-- registro de rescisão (o colaborador desligado não é quem cria a própria
-- rescisão). Vira gestão exclusiva de RH.
DROP POLICY IF EXISTS "Usuarios inserem proprias rescisoes" ON public.historico_rescisoes;
DROP POLICY IF EXISTS "Rescisoes por empresa" ON public.historico_rescisoes;
CREATE POLICY historico_rescisoes_rh_manage ON public.historico_rescisoes
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

DROP POLICY IF EXISTS tenant_asos ON public.asos;
CREATE POLICY asos_rh_manage ON public.asos
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

DROP POLICY IF EXISTS "Afastamentos scoped by empresa" ON public.afastamentos;
DROP POLICY IF EXISTS tenant_afastamentos ON public.afastamentos;
CREATE POLICY afastamentos_manage ON public.afastamentos
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id) OR public.pode_gerir_pessoas(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id) OR public.pode_gerir_pessoas(empresa_id));

DROP POLICY IF EXISTS medidas_disciplinares_delete ON public.medidas_disciplinares;
DROP POLICY IF EXISTS medidas_disciplinares_insert ON public.medidas_disciplinares;
DROP POLICY IF EXISTS medidas_disciplinares_select ON public.medidas_disciplinares;
DROP POLICY IF EXISTS medidas_disciplinares_update ON public.medidas_disciplinares;
CREATE POLICY medidas_disciplinares_manage ON public.medidas_disciplinares
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id) OR public.pode_gerir_pessoas(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id) OR public.pode_gerir_pessoas(empresa_id));

DROP POLICY IF EXISTS desligamentos_tenant_select ON public.desligamentos;
DROP POLICY IF EXISTS tenant_desligamentos_delete ON public.desligamentos;
DROP POLICY IF EXISTS tenant_desligamentos_insert ON public.desligamentos;
DROP POLICY IF EXISTS tenant_desligamentos_select ON public.desligamentos;
DROP POLICY IF EXISTS tenant_desligamentos_update ON public.desligamentos;
CREATE POLICY desligamentos_rh_manage ON public.desligamentos
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

-- adiantamentos_salariais / emprestimos_consignados: bug real, não só gap de
-- papel. Predicado antigo era `empresa_id IN (SELECT id FROM empresas)` —
-- todas as empresas da base, sem tenant scope. Role "public" também incluía
-- anon.
DROP POLICY IF EXISTS "Gestores podem gerenciar adiantamentos da empresa" ON public.adiantamentos_salariais;
CREATE POLICY adiantamentos_salariais_rh_manage ON public.adiantamentos_salariais
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

DROP POLICY IF EXISTS "Gestores podem gerenciar empréstimos da empresa" ON public.emprestimos_consignados;
CREATE POLICY emprestimos_consignados_rh_manage ON public.emprestimos_consignados
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

-- canal_etica: canal de ética/denúncia é anônimo por design (coluna
-- `anonimo`, sem colaborador_id) — autoatendimento de INSERT precisa
-- continuar aberto a qualquer colaborador do tenant. Leitura/tratamento da
-- denúncia (SELECT/UPDATE/DELETE) fica restrita a RH.
DROP POLICY IF EXISTS empresa_canal_etica ON public.canal_etica;
CREATE POLICY canal_etica_reportar ON public.canal_etica
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IS NULL OR public.pertence_a_empresa(empresa_id));
CREATE POLICY canal_etica_rh_manage ON public.canal_etica
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

DROP POLICY IF EXISTS tenant_historico_salarial ON public.historico_salarial;
CREATE POLICY historico_salarial_rh_manage ON public.historico_salarial
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

DROP POLICY IF EXISTS empresa_lgpd_solicitacoes ON public.lgpd_solicitacoes;
CREATE POLICY lgpd_solicitacoes_rh_manage ON public.lgpd_solicitacoes
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

-- Tabelas sem empresa_id direto: gate via join em colaboradores.
DROP POLICY IF EXISTS tenant_anotacoes_colaborador ON public.anotacoes_colaborador;
CREATE POLICY anotacoes_colaborador_manage ON public.anotacoes_colaborador
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = anotacoes_colaborador.colaborador_id
      AND (public.pode_gerir_rh(c.empresa_id) OR public.pode_gerir_pessoas(c.empresa_id))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = anotacoes_colaborador.colaborador_id
      AND (public.pode_gerir_rh(c.empresa_id) OR public.pode_gerir_pessoas(c.empresa_id))
  ));

DROP POLICY IF EXISTS tenant_beneficiarios_plano ON public.beneficiarios_plano;
CREATE POLICY beneficiarios_plano_rh_manage ON public.beneficiarios_plano
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = beneficiarios_plano.colaborador_id AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = beneficiarios_plano.colaborador_id AND public.pode_gerir_rh(c.empresa_id)
  ));

DROP POLICY IF EXISTS tenant_documentos_pessoais_arquivos ON public.documentos_pessoais_arquivos;
CREATE POLICY documentos_pessoais_arquivos_rh_manage ON public.documentos_pessoais_arquivos
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = documentos_pessoais_arquivos.colaborador_id AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = documentos_pessoais_arquivos.colaborador_id AND public.pode_gerir_rh(c.empresa_id)
  ));

DROP POLICY IF EXISTS exames_tenant_select ON public.exames;
DROP POLICY IF EXISTS tenant_exames ON public.exames;
CREATE POLICY exames_rh_manage ON public.exames
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = exames.colaborador_id AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = exames.colaborador_id AND public.pode_gerir_rh(c.empresa_id)
  ));

-- AUTO_SERVICO_ESCRITA (já documentado no gate): o próprio colaborador pode
-- gerenciar seus contatos de emergência e formações acadêmicas sem depender
-- de papel de RH/gestor.
DROP POLICY IF EXISTS tenant_contatos_emergencia ON public.contatos_emergencia;
CREATE POLICY contatos_emergencia_self_or_rh ON public.contatos_emergencia
  FOR ALL TO authenticated
  USING (
    public.sou_o_colaborador(colaborador_id)
    OR EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = contatos_emergencia.colaborador_id
        AND (public.pode_gerir_rh(c.empresa_id) OR public.pode_gerir_pessoas(c.empresa_id))
    )
  )
  WITH CHECK (
    public.sou_o_colaborador(colaborador_id)
    OR EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = contatos_emergencia.colaborador_id
        AND (public.pode_gerir_rh(c.empresa_id) OR public.pode_gerir_pessoas(c.empresa_id))
    )
  );

DROP POLICY IF EXISTS tenant_formacoes_academicas ON public.formacoes_academicas;
CREATE POLICY formacoes_academicas_self_or_rh ON public.formacoes_academicas
  FOR ALL TO authenticated
  USING (
    public.sou_o_colaborador(colaborador_id)
    OR EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = formacoes_academicas.colaborador_id
        AND (public.pode_gerir_rh(c.empresa_id) OR public.pode_gerir_pessoas(c.empresa_id))
    )
  )
  WITH CHECK (
    public.sou_o_colaborador(colaborador_id)
    OR EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = formacoes_academicas.colaborador_id
        AND (public.pode_gerir_rh(c.empresa_id) OR public.pode_gerir_pessoas(c.empresa_id))
    )
  );

-- documentos_colaborador / holerites: leitura própria já existia (role
-- "public", sem gate de RH na gestão). Reescreve a leitura própria com
-- sou_o_colaborador() (assim o gate de auditoria reconhece o AUTO_ACESSO) e
-- passa a gestão a ser exclusiva de RH via join em colaboradores.
DROP POLICY IF EXISTS "Colaboradores podem ver seus próprios documentos" ON public.documentos_colaborador;
DROP POLICY IF EXISTS tenant_documentos_colaborador ON public.documentos_colaborador;
CREATE POLICY documentos_colaborador_self_read ON public.documentos_colaborador
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));
CREATE POLICY documentos_colaborador_rh_manage ON public.documentos_colaborador
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = documentos_colaborador.colaborador_id AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = documentos_colaborador.colaborador_id AND public.pode_gerir_rh(c.empresa_id)
  ));

DROP POLICY IF EXISTS "Colaboradores podem ver seus próprios holerites" ON public.holerites;
DROP POLICY IF EXISTS tenant_holerites ON public.holerites;
CREATE POLICY holerites_self_read ON public.holerites
  FOR SELECT TO authenticated
  USING (public.sou_o_colaborador(colaborador_id));
CREATE POLICY holerites_rh_manage ON public.holerites
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = holerites.colaborador_id AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = holerites.colaborador_id AND public.pode_gerir_rh(c.empresa_id)
  ));

-- lancamentos_folha só tem holerite_id — join de 2 níveis até colaboradores.
DROP POLICY IF EXISTS tenant_lancamentos_folha ON public.lancamentos_folha;
CREATE POLICY lancamentos_folha_rh_manage ON public.lancamentos_folha
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.holerites h
    JOIN public.colaboradores c ON c.id = h.colaborador_id
    WHERE h.id = lancamentos_folha.holerite_id AND public.pode_gerir_rh(c.empresa_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.holerites h
    JOIN public.colaboradores c ON c.id = h.colaborador_id
    WHERE h.id = lancamentos_folha.holerite_id AND public.pode_gerir_rh(c.empresa_id)
  ));
