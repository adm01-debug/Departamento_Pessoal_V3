-- =====================================================================
-- Fecha vazamento cross-tenant em tabelas-filha sem empresa_id.
-- Predicado anterior: auth.uid() IS NOT NULL  (apenas autenticacao).
-- Predicado novo: correlacao com o tenant via tabela pai.
-- =====================================================================

-- 1) documentos_historico -> documentos -> colaboradores.empresa_id
DROP POLICY IF EXISTS "Documentos historico authenticated" ON public.documentos_historico;

CREATE POLICY "tenant_documentos_historico"
ON public.documentos_historico
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.documentos d
    JOIN public.colaboradores c ON c.id = d.colaborador_id
    WHERE d.id = documentos_historico.documento_id
      AND public.pertence_a_empresa(c.empresa_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.documentos d
    JOIN public.colaboradores c ON c.id = d.colaborador_id
    WHERE d.id = documentos_historico.documento_id
      AND public.pertence_a_empresa(c.empresa_id)
  )
);

-- 2) treinamento_instancias -> catalogo_cursos.empresa_id
DROP POLICY IF EXISTS "Treinamento instancias authenticated" ON public.treinamento_instancias;

CREATE POLICY "tenant_treinamento_instancias"
ON public.treinamento_instancias
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.catalogo_cursos cc
    WHERE cc.id = treinamento_instancias.curso_id
      AND public.pertence_a_empresa(cc.empresa_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.catalogo_cursos cc
    WHERE cc.id = treinamento_instancias.curso_id
      AND public.pertence_a_empresa(cc.empresa_id)
  )
);

-- 3) treinamento_feedback -> inscricoes_cursos.empresa_id
DROP POLICY IF EXISTS "Treinamento feedback authenticated" ON public.treinamento_feedback;

CREATE POLICY "tenant_treinamento_feedback"
ON public.treinamento_feedback
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.inscricoes_cursos ic
    WHERE ic.id = treinamento_feedback.inscricao_id
      AND public.pertence_a_empresa(ic.empresa_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.inscricoes_cursos ic
    WHERE ic.id = treinamento_feedback.inscricao_id
      AND public.pertence_a_empresa(ic.empresa_id)
  )
);

-- 4) premiacoes_pagamentos -> campanha OU colaborador
DROP POLICY IF EXISTS "Premiacoes pagamentos scoped" ON public.premiacoes_pagamentos;

CREATE POLICY "tenant_premiacoes_pagamentos_select"
ON public.premiacoes_pagamentos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.premiacoes_campanhas pc
    WHERE pc.id = premiacoes_pagamentos.campanha_id
      AND public.pertence_a_empresa(pc.empresa_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = premiacoes_pagamentos.colaborador_id
      AND public.pertence_a_empresa(c.empresa_id)
  )
);

-- 5) premiacoes_regras -> premiacoes_campanhas.empresa_id
DROP POLICY IF EXISTS "Premiacoes regras scoped" ON public.premiacoes_regras;

CREATE POLICY "tenant_premiacoes_regras_select"
ON public.premiacoes_regras
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.premiacoes_campanhas pc
    WHERE pc.id = premiacoes_regras.campanha_id
      AND public.pertence_a_empresa(pc.empresa_id)
  )
);

-- 6) trilha_auditoria_ponto -> batidas_ponto.empresa_id
DROP POLICY IF EXISTS "Acesso à trilha de auditoria" ON public.trilha_auditoria_ponto;

CREATE POLICY "tenant_trilha_auditoria_ponto_select"
ON public.trilha_auditoria_ponto
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.batidas_ponto bp
    WHERE bp.id = trilha_auditoria_ponto.ponto_id
      AND public.pertence_a_empresa(bp.empresa_id)
  )
);

-- 7) premiacoes_auditoria: entidade_id e polimorfico, sem pai navegavel.
--    Sem correlacao possivel -> restringe a admin/rh.
DROP POLICY IF EXISTS "Usuários autenticados podem ver auditoria de premiações" ON public.premiacoes_auditoria;

CREATE POLICY "premiacoes_auditoria_admin_rh_select"
ON public.premiacoes_auditoria
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'rh'::app_role)
);

-- 8) Remove politicas mortas de onboarding (empresa_id = auth.uid() nunca e verdadeiro).
--    A politica correta "Tenant scoped onboarding_*" ja cobre o acesso.
DROP POLICY IF EXISTS "Multi-tenant access" ON public.onboarding_colaborador;
DROP POLICY IF EXISTS "Multi-tenant access" ON public.onboarding_tarefas;
