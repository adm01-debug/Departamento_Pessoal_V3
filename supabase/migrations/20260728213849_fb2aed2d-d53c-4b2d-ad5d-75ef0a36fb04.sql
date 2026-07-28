-- 1. Remove políticas legadas em role public (inclui anon) baseadas em e-mail
DROP POLICY IF EXISTS "Users can see their company remessas" ON public.cnab_remessas;
DROP POLICY IF EXISTS "Users can insert their company remessas" ON public.cnab_remessas;

-- 2. Padroniza políticas de cnab_remessas (tenant-scoped, authenticated only)
DROP POLICY IF EXISTS "CNAB remessas leitura por empresa" ON public.cnab_remessas;
DROP POLICY IF EXISTS "CNAB remessas insercao por empresa" ON public.cnab_remessas;
DROP POLICY IF EXISTS cnab_remessas_tenant_select ON public.cnab_remessas;
DROP POLICY IF EXISTS cnab_remessas_tenant_insert ON public.cnab_remessas;
DROP POLICY IF EXISTS cnab_remessas_tenant_update ON public.cnab_remessas;
DROP POLICY IF EXISTS cnab_remessas_tenant_delete ON public.cnab_remessas;

CREATE POLICY cnab_remessas_tenant_select ON public.cnab_remessas
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY cnab_remessas_tenant_insert ON public.cnab_remessas
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY cnab_remessas_tenant_update ON public.cnab_remessas
  FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY cnab_remessas_tenant_delete ON public.cnab_remessas
  FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- 3. Padroniza políticas de pix_lotes
DROP POLICY IF EXISTS "PIX lotes leitura por empresa" ON public.pix_lotes;
DROP POLICY IF EXISTS "PIX lotes insercao por empresa" ON public.pix_lotes;
DROP POLICY IF EXISTS pix_lotes_tenant_select ON public.pix_lotes;
DROP POLICY IF EXISTS pix_lotes_tenant_insert ON public.pix_lotes;
DROP POLICY IF EXISTS pix_lotes_tenant_update ON public.pix_lotes;
DROP POLICY IF EXISTS pix_lotes_tenant_delete ON public.pix_lotes;

CREATE POLICY pix_lotes_tenant_select ON public.pix_lotes
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY pix_lotes_tenant_insert ON public.pix_lotes
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY pix_lotes_tenant_update ON public.pix_lotes
  FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));
CREATE POLICY pix_lotes_tenant_delete ON public.pix_lotes
  FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT public.get_user_empresas(auth.uid())));

-- 4. Reafirma itens correlacionados ao lote/remessa da empresa
DROP POLICY IF EXISTS cnab_itens_tenant_select ON public.cnab_itens;
DROP POLICY IF EXISTS cnab_itens_tenant_insert ON public.cnab_itens;
DROP POLICY IF EXISTS cnab_itens_tenant_update ON public.cnab_itens;
DROP POLICY IF EXISTS cnab_itens_tenant_delete ON public.cnab_itens;

CREATE POLICY cnab_itens_tenant_select ON public.cnab_itens
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cnab_remessas r
    WHERE r.id = cnab_itens.remessa_id
      AND r.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));
CREATE POLICY cnab_itens_tenant_insert ON public.cnab_itens
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.cnab_remessas r
    WHERE r.id = cnab_itens.remessa_id
      AND r.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));
CREATE POLICY cnab_itens_tenant_update ON public.cnab_itens
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cnab_remessas r
    WHERE r.id = cnab_itens.remessa_id
      AND r.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cnab_remessas r
    WHERE r.id = cnab_itens.remessa_id
      AND r.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));
CREATE POLICY cnab_itens_tenant_delete ON public.cnab_itens
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cnab_remessas r
    WHERE r.id = cnab_itens.remessa_id
      AND r.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

DROP POLICY IF EXISTS pix_itens_tenant_select ON public.pix_itens;
DROP POLICY IF EXISTS pix_itens_tenant_insert ON public.pix_itens;
DROP POLICY IF EXISTS pix_itens_tenant_update ON public.pix_itens;
DROP POLICY IF EXISTS pix_itens_tenant_delete ON public.pix_itens;

CREATE POLICY pix_itens_tenant_select ON public.pix_itens
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pix_lotes l
    WHERE l.id = pix_itens.lote_id
      AND l.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));
CREATE POLICY pix_itens_tenant_insert ON public.pix_itens
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.pix_lotes l
    WHERE l.id = pix_itens.lote_id
      AND l.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));
CREATE POLICY pix_itens_tenant_update ON public.pix_itens
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pix_lotes l
    WHERE l.id = pix_itens.lote_id
      AND l.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pix_lotes l
    WHERE l.id = pix_itens.lote_id
      AND l.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));
CREATE POLICY pix_itens_tenant_delete ON public.pix_itens
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pix_lotes l
    WHERE l.id = pix_itens.lote_id
      AND l.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- 5. Grants explícitos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cnab_remessas, public.cnab_itens, public.pix_lotes, public.pix_itens TO authenticated;
GRANT ALL ON public.cnab_remessas, public.cnab_itens, public.pix_lotes, public.pix_itens TO service_role;
REVOKE ALL ON public.cnab_remessas, public.cnab_itens, public.pix_lotes, public.pix_itens FROM anon;