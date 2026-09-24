-- P1: close residual audit-rls-least-privilege violations left by
-- 20260924140000. That migration correctly moved dependentes/pix_itens/
-- cnab_itens from zero-correlation or JWT-claim-based reads to correct
-- tenant scoping, but their SELECT policies still let ANY authenticated
-- member of the tenant read the rows (estagiário == RH). Investigation
-- this session confirmed zero frontend usage of tenant-wide read on these
-- 3 tables outside RH/financeiro screens (FinanceiroBancarioPage,
-- rescisaoService, calculoBeneficiosService, colaboradorDetalhesService) —
-- unlike `colaboradores`, which has 4 shared UI surfaces (dashboard KPIs,
-- sidebar badge, command palette, vencimento alerts) that depend on
-- broader read and are deliberately left untouched here pending an RPC
-- migration for those widgets.

DROP POLICY IF EXISTS "dependentes_tenant_read" ON public.dependentes;
CREATE POLICY "dependentes_tenant_read" ON public.dependentes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.colaboradores c
      WHERE c.id = dependentes.colaborador_id AND public.pode_gerir_pessoas(c.empresa_id)
    )
  );

DROP POLICY IF EXISTS "pix_itens_tenant_read" ON public.pix_itens;
CREATE POLICY "pix_itens_tenant_read" ON public.pix_itens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pix_lotes l
      WHERE l.id = pix_itens.lote_id AND public.pode_gerir_rh(l.empresa_id)
    )
  );

DROP POLICY IF EXISTS "cnab_itens_tenant_read" ON public.cnab_itens;
CREATE POLICY "cnab_itens_tenant_read" ON public.cnab_itens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cnab_remessas r
      WHERE r.id = cnab_itens.remessa_id AND public.pode_gerir_rh(r.empresa_id)
    )
  );
