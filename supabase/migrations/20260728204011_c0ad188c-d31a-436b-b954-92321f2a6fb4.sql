-- ============================================================
-- ETAPA 1: isolamento multi-tenant em cnab_itens e pix_itens
-- Predicados anteriores ("remessa_id IN (SELECT id FROM cnab_remessas)")
-- eram sempre verdadeiros -> leitura/escrita cross-tenant de dados bancarios.
-- ============================================================

-- cnab_itens ------------------------------------------------
DROP POLICY IF EXISTS "Users can see their company cnab items" ON public.cnab_itens;
DROP POLICY IF EXISTS "Empresas can view their own CNAB itens" ON public.cnab_itens;
DROP POLICY IF EXISTS "Empresas can insert their own CNAB itens" ON public.cnab_itens;

CREATE POLICY "cnab_itens_tenant_select"
ON public.cnab_itens FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cnab_remessas r
    WHERE r.id = cnab_itens.remessa_id
      AND r.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

CREATE POLICY "cnab_itens_tenant_insert"
ON public.cnab_itens FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cnab_remessas r
    WHERE r.id = cnab_itens.remessa_id
      AND r.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

CREATE POLICY "cnab_itens_tenant_update"
ON public.cnab_itens FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cnab_remessas r
    WHERE r.id = cnab_itens.remessa_id
      AND r.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cnab_remessas r
    WHERE r.id = cnab_itens.remessa_id
      AND r.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

CREATE POLICY "cnab_itens_tenant_delete"
ON public.cnab_itens FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cnab_remessas r
    WHERE r.id = cnab_itens.remessa_id
      AND r.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

-- pix_itens -------------------------------------------------
DROP POLICY IF EXISTS "Empresas can view their own PIX itens" ON public.pix_itens;
DROP POLICY IF EXISTS "Empresas can insert their own PIX itens" ON public.pix_itens;

CREATE POLICY "pix_itens_tenant_select"
ON public.pix_itens FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pix_lotes l
    WHERE l.id = pix_itens.lote_id
      AND l.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

CREATE POLICY "pix_itens_tenant_insert"
ON public.pix_itens FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pix_lotes l
    WHERE l.id = pix_itens.lote_id
      AND l.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

CREATE POLICY "pix_itens_tenant_update"
ON public.pix_itens FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pix_lotes l
    WHERE l.id = pix_itens.lote_id
      AND l.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pix_lotes l
    WHERE l.id = pix_itens.lote_id
      AND l.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

CREATE POLICY "pix_itens_tenant_delete"
ON public.pix_itens FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pix_lotes l
    WHERE l.id = pix_itens.lote_id
      AND l.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  )
);

-- Indices de apoio (os predicados navegam pela FK)
CREATE INDEX IF NOT EXISTS idx_cnab_itens_remessa_id ON public.cnab_itens (remessa_id);
CREATE INDEX IF NOT EXISTS idx_pix_itens_lote_id ON public.pix_itens (lote_id);

-- Defesa em profundidade: visitantes anonimos nao leem itens de pagamento
REVOKE SELECT ON public.cnab_itens FROM anon;
REVOKE SELECT ON public.pix_itens FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cnab_itens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pix_itens TO authenticated;
GRANT ALL ON public.cnab_itens TO service_role;
GRANT ALL ON public.pix_itens TO service_role;
