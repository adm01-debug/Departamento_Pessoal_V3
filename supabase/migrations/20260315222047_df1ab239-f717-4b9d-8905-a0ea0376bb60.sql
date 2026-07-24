-- Harden RLS for auxiliary tables used by implemented modules

-- comunicados_leituras: only own reads within accessible empresa
DROP POLICY IF EXISTS "auth_comunicados_leituras_all" ON public.comunicados_leituras;
DROP POLICY IF EXISTS "comunicados_leituras_select" ON public.comunicados_leituras;
CREATE POLICY "comunicados_leituras_select" ON public.comunicados_leituras
FOR SELECT TO authenticated
USING (
  usuario_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.comunicados c
    WHERE c.id = comunicado_id
      AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);
DROP POLICY IF EXISTS "comunicados_leituras_insert" ON public.comunicados_leituras;
CREATE POLICY "comunicados_leituras_insert" ON public.comunicados_leituras
FOR INSERT TO authenticated
WITH CHECK (
  usuario_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.comunicados c
    WHERE c.id = comunicado_id
      AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);
DROP POLICY IF EXISTS "comunicados_leituras_update" ON public.comunicados_leituras;
CREATE POLICY "comunicados_leituras_update" ON public.comunicados_leituras
FOR UPDATE TO authenticated
USING (
  usuario_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.comunicados c
    WHERE c.id = comunicado_id
      AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
)
WITH CHECK (
  usuario_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.comunicados c
    WHERE c.id = comunicado_id
      AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);
DROP POLICY IF EXISTS "comunicados_leituras_delete" ON public.comunicados_leituras;
CREATE POLICY "comunicados_leituras_delete" ON public.comunicados_leituras
FOR DELETE TO authenticated
USING (
  usuario_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.comunicados c
    WHERE c.id = comunicado_id
      AND c.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

-- pesquisas_perguntas: inherit tenant from parent pesquisa
DROP POLICY IF EXISTS "auth_pesquisas_perguntas_all" ON public.pesquisas_perguntas;
DROP POLICY IF EXISTS "pesquisas_perguntas_select" ON public.pesquisas_perguntas;
CREATE POLICY "pesquisas_perguntas_select" ON public.pesquisas_perguntas
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pesquisas p
    WHERE p.id = pesquisa_id
      AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);
DROP POLICY IF EXISTS "pesquisas_perguntas_insert" ON public.pesquisas_perguntas;
CREATE POLICY "pesquisas_perguntas_insert" ON public.pesquisas_perguntas
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pesquisas p
    WHERE p.id = pesquisa_id
      AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);
DROP POLICY IF EXISTS "pesquisas_perguntas_update" ON public.pesquisas_perguntas;
CREATE POLICY "pesquisas_perguntas_update" ON public.pesquisas_perguntas
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pesquisas p
    WHERE p.id = pesquisa_id
      AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pesquisas p
    WHERE p.id = pesquisa_id
      AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);
DROP POLICY IF EXISTS "pesquisas_perguntas_delete" ON public.pesquisas_perguntas;
CREATE POLICY "pesquisas_perguntas_delete" ON public.pesquisas_perguntas
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pesquisas p
    WHERE p.id = pesquisa_id
      AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

-- pesquisas_respostas: inherit tenant from parent pesquisa
DROP POLICY IF EXISTS "auth_pesquisas_respostas_all" ON public.pesquisas_respostas;
DROP POLICY IF EXISTS "pesquisas_respostas_select" ON public.pesquisas_respostas;
CREATE POLICY "pesquisas_respostas_select" ON public.pesquisas_respostas
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pesquisas p
    WHERE p.id = pesquisa_id
      AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);
DROP POLICY IF EXISTS "pesquisas_respostas_insert" ON public.pesquisas_respostas;
CREATE POLICY "pesquisas_respostas_insert" ON public.pesquisas_respostas
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pesquisas p
    WHERE p.id = pesquisa_id
      AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);
DROP POLICY IF EXISTS "pesquisas_respostas_update" ON public.pesquisas_respostas;
CREATE POLICY "pesquisas_respostas_update" ON public.pesquisas_respostas
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pesquisas p
    WHERE p.id = pesquisa_id
      AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.pesquisas p
    WHERE p.id = pesquisa_id
      AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);
DROP POLICY IF EXISTS "pesquisas_respostas_delete" ON public.pesquisas_respostas;
CREATE POLICY "pesquisas_respostas_delete" ON public.pesquisas_respostas
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.pesquisas p
    WHERE p.id = pesquisa_id
      AND p.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

-- workflows_etapas: inherit tenant from parent workflow
DROP POLICY IF EXISTS "auth_workflows_etapas_all" ON public.workflows_etapas;
DROP POLICY IF EXISTS "workflows_etapas_select" ON public.workflows_etapas;
CREATE POLICY "workflows_etapas_select" ON public.workflows_etapas
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workflows_definicoes w
    WHERE w.id = workflow_id
      AND w.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);
DROP POLICY IF EXISTS "workflows_etapas_insert" ON public.workflows_etapas;
CREATE POLICY "workflows_etapas_insert" ON public.workflows_etapas
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.workflows_definicoes w
    WHERE w.id = workflow_id
      AND w.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);
DROP POLICY IF EXISTS "workflows_etapas_update" ON public.workflows_etapas;
CREATE POLICY "workflows_etapas_update" ON public.workflows_etapas
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workflows_definicoes w
    WHERE w.id = workflow_id
      AND w.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.workflows_definicoes w
    WHERE w.id = workflow_id
      AND w.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);
DROP POLICY IF EXISTS "workflows_etapas_delete" ON public.workflows_etapas;
CREATE POLICY "workflows_etapas_delete" ON public.workflows_etapas
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workflows_definicoes w
    WHERE w.id = workflow_id
      AND w.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

-- workflows_historico: inherit tenant from parent execução
DROP POLICY IF EXISTS "auth_workflows_hist_all" ON public.workflows_historico;
DROP POLICY IF EXISTS "workflows_historico_select" ON public.workflows_historico;
CREATE POLICY "workflows_historico_select" ON public.workflows_historico
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workflows_execucoes e
    WHERE e.id = execucao_id
      AND e.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);
DROP POLICY IF EXISTS "workflows_historico_insert" ON public.workflows_historico;
CREATE POLICY "workflows_historico_insert" ON public.workflows_historico
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.workflows_execucoes e
    WHERE e.id = execucao_id
      AND e.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);
DROP POLICY IF EXISTS "workflows_historico_update" ON public.workflows_historico;
CREATE POLICY "workflows_historico_update" ON public.workflows_historico
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workflows_execucoes e
    WHERE e.id = execucao_id
      AND e.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.workflows_execucoes e
    WHERE e.id = execucao_id
      AND e.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);
DROP POLICY IF EXISTS "workflows_historico_delete" ON public.workflows_historico;
CREATE POLICY "workflows_historico_delete" ON public.workflows_historico
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.workflows_execucoes e
    WHERE e.id = execucao_id
      AND e.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);