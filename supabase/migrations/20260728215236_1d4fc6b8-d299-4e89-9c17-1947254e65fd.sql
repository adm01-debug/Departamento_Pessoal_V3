-- =========================================================
-- 1. Helper canônico de escopo de empresa
--    Fonte de verdade: tabela user_empresas (vínculo persistido),
--    não claim de token (que envelhece e não cobre multi-empresa).
-- =========================================================
CREATE OR REPLACE FUNCTION public.pertence_a_empresa(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _empresa_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.user_empresas ue
       WHERE ue.user_id = auth.uid()
         AND ue.empresa_id = _empresa_id
     );
$function$;

COMMENT ON FUNCTION public.pertence_a_empresa(uuid) IS
  'Verdadeiro quando o usuário autenticado tem vínculo com a empresa informada. '
  'Predicado canônico de multi-tenancy em RLS. Retorna falso para _empresa_id nulo '
  '(evita que linha órfã fique acessível) e para chamadas sem sessão (auth.uid() nulo).';

REVOKE ALL ON FUNCTION public.pertence_a_empresa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pertence_a_empresa(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_auth_empresa_id() IS
  'OBSOLETA: lê app_metadata.empresa_id do JWT. Não reflete vínculos criados após '
  'a emissão do token e suporta apenas uma empresa por usuário. '
  'Use public.pertence_a_empresa(empresa_id) em políticas RLS.';

-- =========================================================
-- 2. colaboradores
-- =========================================================
DROP POLICY IF EXISTS "empresa_isolation_colaboradores" ON public.colaboradores;

CREATE POLICY "colaboradores_tenant_all"
ON public.colaboradores FOR ALL TO authenticated
USING (public.pertence_a_empresa(empresa_id))
WITH CHECK (public.pertence_a_empresa(empresa_id));

-- =========================================================
-- 3. dependentes (tenant derivado do colaborador)
-- =========================================================
DROP POLICY IF EXISTS "empresa_isolation_dependentes" ON public.dependentes;

CREATE POLICY "dependentes_tenant_all"
ON public.dependentes FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = dependentes.colaborador_id
      AND public.pertence_a_empresa(c.empresa_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.colaboradores c
    WHERE c.id = dependentes.colaborador_id
      AND public.pertence_a_empresa(c.empresa_id)
  )
);

-- =========================================================
-- 4. ferias
-- =========================================================
DROP POLICY IF EXISTS "empresa_isolation_ferias" ON public.ferias;

CREATE POLICY "ferias_tenant_all"
ON public.ferias FOR ALL TO authenticated
USING (public.pertence_a_empresa(empresa_id))
WITH CHECK (public.pertence_a_empresa(empresa_id));

-- =========================================================
-- 5. provisoes_folha
-- =========================================================
DROP POLICY IF EXISTS "Visualização por empresa provisoes" ON public.provisoes_folha;

CREATE POLICY "provisoes_folha_tenant_select"
ON public.provisoes_folha FOR SELECT TO authenticated
USING (public.pertence_a_empresa(empresa_id));

-- =========================================================
-- 6. Índices de apoio ao predicado de tenant
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_colaboradores_empresa_id ON public.colaboradores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_dependentes_colaborador_id ON public.dependentes(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_ferias_empresa_id ON public.ferias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_provisoes_folha_empresa_id ON public.provisoes_folha(empresa_id);
CREATE INDEX IF NOT EXISTS idx_user_empresas_user_empresa ON public.user_empresas(user_id, empresa_id);
