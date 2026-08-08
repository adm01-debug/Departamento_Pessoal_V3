-- ============================================================
-- ETAPA 2: isolamento multi-tenant em documentos de saude
-- ============================================================

DROP POLICY IF EXISTS "Users can manage their company docs" ON public.documentos_afastamento;
DROP POLICY IF EXISTS "Users can manage their company prorrogacoes" ON public.prorrogacoes_afastamento;

CREATE POLICY "documentos_afastamento_tenant_all"
ON public.documentos_afastamento FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.afastamentos a
    WHERE a.id = documentos_afastamento.afastamento_id
      AND a.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.afastamentos a
    WHERE a.id = documentos_afastamento.afastamento_id
      AND a.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

CREATE POLICY "prorrogacoes_afastamento_tenant_all"
ON public.prorrogacoes_afastamento FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.afastamentos a
    WHERE a.id = prorrogacoes_afastamento.afastamento_id
      AND a.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.afastamentos a
    WHERE a.id = prorrogacoes_afastamento.afastamento_id
      AND a.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

CREATE INDEX IF NOT EXISTS idx_documentos_afastamento_afastamento_id
  ON public.documentos_afastamento (afastamento_id);
CREATE INDEX IF NOT EXISTS idx_prorrogacoes_afastamento_afastamento_id
  ON public.prorrogacoes_afastamento (afastamento_id);

REVOKE SELECT ON public.documentos_afastamento FROM anon;
REVOKE SELECT ON public.prorrogacoes_afastamento FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_afastamento TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prorrogacoes_afastamento TO authenticated;
GRANT ALL ON public.documentos_afastamento TO service_role;
GRANT ALL ON public.prorrogacoes_afastamento TO service_role;
