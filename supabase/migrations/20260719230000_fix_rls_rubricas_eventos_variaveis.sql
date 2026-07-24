-- Migration: Fix RLS USING(true) on rubricas_folha and eventos_variaveis (C52)
--
-- rubricas_folha: shared reference catalog — SELECT stays open but
--   mutations must be admin-only (any authenticated user could otherwise
--   delete or corrupt system payroll line items).
--
-- eventos_variaveis: no empresa_id column, but scoped via colaborador_id
--   → colaboradores → empresa_id. USING(true) allowed full cross-tenant
--   read and write of variable payroll events.

-- ─── 1. rubricas_folha ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can manage rubricas" ON public.rubricas_folha;
DROP POLICY IF EXISTS "rubricas_folha_admin_write" ON public.rubricas_folha;

-- SELECT remains open — rubricas are Brazilian standard catalog reference data
-- (the SELECT-only policy from the original migration stays in place)

-- Mutations (INSERT/UPDATE/DELETE) require admin role
CREATE POLICY "rubricas_folha_admin_write" ON public.rubricas_folha
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ─── 2. eventos_variaveis ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can manage eventos_variaveis" ON public.eventos_variaveis;
DROP POLICY IF EXISTS "eventos_variaveis_tenant" ON public.eventos_variaveis;

-- Scope via colaborador → empresa_id (no direct empresa_id column on this table)
CREATE POLICY "eventos_variaveis_tenant" ON public.eventos_variaveis
  FOR ALL TO authenticated
  USING (
    colaborador_id IN (
      SELECT id FROM public.colaboradores
      WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
    )
  )
  WITH CHECK (
    colaborador_id IN (
      SELECT id FROM public.colaboradores
      WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
    )
  );

-- ─── 3. parametros_fiscais ────────────────────────────────────────────────────
-- SELECT USING(true) is correct — these are public Brazilian tax brackets (INSS/IRRF).
-- There is no mutation policy, so INSERT/UPDATE/DELETE are already denied for
-- non-service-role callers. No change needed.
