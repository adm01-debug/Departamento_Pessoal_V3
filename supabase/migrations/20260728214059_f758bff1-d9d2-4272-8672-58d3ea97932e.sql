-- 1. documentos_afastamento: políticas explícitas por comando, correlacionadas à empresa
DROP POLICY IF EXISTS documentos_afastamento_tenant_all ON public.documentos_afastamento;
DROP POLICY IF EXISTS documentos_afastamento_tenant_select ON public.documentos_afastamento;
DROP POLICY IF EXISTS documentos_afastamento_tenant_insert ON public.documentos_afastamento;
DROP POLICY IF EXISTS documentos_afastamento_tenant_update ON public.documentos_afastamento;
DROP POLICY IF EXISTS documentos_afastamento_tenant_delete ON public.documentos_afastamento;

CREATE POLICY documentos_afastamento_tenant_select ON public.documentos_afastamento
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.afastamentos a
    WHERE a.id = documentos_afastamento.afastamento_id
      AND a.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

CREATE POLICY documentos_afastamento_tenant_insert ON public.documentos_afastamento
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.afastamentos a
    WHERE a.id = documentos_afastamento.afastamento_id
      AND a.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

CREATE POLICY documentos_afastamento_tenant_update ON public.documentos_afastamento
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.afastamentos a
    WHERE a.id = documentos_afastamento.afastamento_id
      AND a.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.afastamentos a
    WHERE a.id = documentos_afastamento.afastamento_id
      AND a.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

CREATE POLICY documentos_afastamento_tenant_delete ON public.documentos_afastamento
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.afastamentos a
    WHERE a.id = documentos_afastamento.afastamento_id
      AND a.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- 2. prorrogacoes_afastamento
DROP POLICY IF EXISTS prorrogacoes_afastamento_tenant_all ON public.prorrogacoes_afastamento;
DROP POLICY IF EXISTS prorrogacoes_afastamento_tenant_select ON public.prorrogacoes_afastamento;
DROP POLICY IF EXISTS prorrogacoes_afastamento_tenant_insert ON public.prorrogacoes_afastamento;
DROP POLICY IF EXISTS prorrogacoes_afastamento_tenant_update ON public.prorrogacoes_afastamento;
DROP POLICY IF EXISTS prorrogacoes_afastamento_tenant_delete ON public.prorrogacoes_afastamento;

CREATE POLICY prorrogacoes_afastamento_tenant_select ON public.prorrogacoes_afastamento
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.afastamentos a
    WHERE a.id = prorrogacoes_afastamento.afastamento_id
      AND a.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

CREATE POLICY prorrogacoes_afastamento_tenant_insert ON public.prorrogacoes_afastamento
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.afastamentos a
    WHERE a.id = prorrogacoes_afastamento.afastamento_id
      AND a.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

CREATE POLICY prorrogacoes_afastamento_tenant_update ON public.prorrogacoes_afastamento
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.afastamentos a
    WHERE a.id = prorrogacoes_afastamento.afastamento_id
      AND a.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.afastamentos a
    WHERE a.id = prorrogacoes_afastamento.afastamento_id
      AND a.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

CREATE POLICY prorrogacoes_afastamento_tenant_delete ON public.prorrogacoes_afastamento
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.afastamentos a
    WHERE a.id = prorrogacoes_afastamento.afastamento_id
      AND a.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- 3. Remove política duplicada em afastamentos (idêntica à mantida)
DROP POLICY IF EXISTS "Afastamentos scoped by empresa" ON public.afastamentos;

-- 4. Privilégios: nenhum acesso anônimo
REVOKE ALL ON public.afastamentos, public.documentos_afastamento, public.prorrogacoes_afastamento FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.afastamentos, public.documentos_afastamento, public.prorrogacoes_afastamento TO authenticated;
GRANT ALL ON public.afastamentos, public.documentos_afastamento, public.prorrogacoes_afastamento TO service_role;

-- 5. Índices de apoio à verificação de acesso
CREATE INDEX IF NOT EXISTS idx_documentos_afastamento_afastamento_id ON public.documentos_afastamento(afastamento_id);
CREATE INDEX IF NOT EXISTS idx_prorrogacoes_afastamento_afastamento_id ON public.prorrogacoes_afastamento(afastamento_id);
CREATE INDEX IF NOT EXISTS idx_afastamentos_empresa_id ON public.afastamentos(empresa_id);