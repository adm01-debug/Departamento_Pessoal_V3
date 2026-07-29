-- ============================================================
-- CNAB: itens de remessa bancaria
-- ============================================================
DROP POLICY IF EXISTS "cnab_itens_tenant_insert" ON public.cnab_itens;
DROP POLICY IF EXISTS "cnab_itens_tenant_update" ON public.cnab_itens;
DROP POLICY IF EXISTS "cnab_itens_tenant_delete" ON public.cnab_itens;

CREATE POLICY "cnab_itens_rh_write" ON public.cnab_itens FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cnab_remessas r
                 WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cnab_remessas r
                 WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id)));

-- ============================================================
-- PIX: itens de lote de pagamento
-- ============================================================
DROP POLICY IF EXISTS "pix_itens_tenant_insert" ON public.pix_itens;
DROP POLICY IF EXISTS "pix_itens_tenant_update" ON public.pix_itens;
DROP POLICY IF EXISTS "pix_itens_tenant_delete" ON public.pix_itens;

CREATE POLICY "pix_itens_rh_write" ON public.pix_itens FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pix_lotes l
                 WHERE l.id = pix_itens.lote_id AND public.pode_gerir_rh(l.empresa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pix_lotes l
                 WHERE l.id = pix_itens.lote_id AND public.pode_gerir_rh(l.empresa_id)));

-- ============================================================
-- HISTORICO DE RESCISOES
-- `auth.uid() = created_by` nao autoriza nada: o proprio autor
-- preenche o campo. Era uma assinatura, nao uma permissao.
-- ============================================================
DROP POLICY IF EXISTS "Usuarios inserem proprias rescisoes" ON public.historico_rescisoes;

CREATE POLICY "rescisoes_rh_write" ON public.historico_rescisoes FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));