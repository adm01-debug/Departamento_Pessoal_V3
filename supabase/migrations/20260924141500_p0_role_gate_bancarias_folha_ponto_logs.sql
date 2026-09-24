-- P0/P1: close remaining tenant-only-without-role gaps (A-009) and the two
-- residual USING(true) policies (A-003 residual) confirmed live by the
-- 24/09/2026 delta audit.
--
-- Same discipline as 20260924140000: every DROP POLICY target below was
-- read from pg_policies on the live database immediately before writing
-- this file (not copied from the never-applied 19-31/07/2026 batch).
--
-- registros_ponto is intentionally NOT role-gated here: the live
-- "tenant_registros_ponto" policy already scopes by get_user_empresas(),
-- and actual writes go through the registrar_batida_ponto() RPC, not raw
-- table access. Only "empresa_isolation_ponto" (a redundant, superseded
-- policy) is dropped.

DO $preflight$
BEGIN
  IF to_regprocedure('public.pode_gerir_rh(uuid)') IS NULL
     OR to_regprocedure('public.pode_gerir_pessoas(uuid)') IS NULL
     OR to_regprocedure('public.is_admin(uuid)') IS NULL THEN
    RAISE EXCEPTION 'P0 RLS remediation requires pode_gerir_rh, pode_gerir_pessoas and is_admin';
  END IF;
END
$preflight$;

-- ============================================================
-- contas_bancarias (dados bancarios de folha; unica policy viva era
-- tenant-wide ALL, sem checar papel)
-- ============================================================
DROP POLICY IF EXISTS "tenant_contas_bancarias" ON public.contas_bancarias;

CREATE POLICY "contas_bancarias_rh_manage" ON public.contas_bancarias
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

-- ============================================================
-- folha_itens (sem empresa_id direto; junta via folhas_pagamento)
-- ============================================================
DROP POLICY IF EXISTS "Folha itens scoped via folha" ON public.folha_itens;

CREATE POLICY "folha_itens_rh_manage" ON public.folha_itens
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.folhas_pagamento f
      WHERE f.id = folha_itens.folha_id AND public.pode_gerir_rh(f.empresa_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.folhas_pagamento f
      WHERE f.id = folha_itens.folha_id AND public.pode_gerir_rh(f.empresa_id)
    )
  );

-- ============================================================
-- folhas_pagamento (7 policies sobrepostas; a role-gated "Gestão de folha
-- por cargo" era anulada pelas 4 tenant-only via OR de policies PERMISSIVE)
-- ============================================================
DROP POLICY IF EXISTS "Empresa vê suas próprias folhas" ON public.folhas_pagamento;
DROP POLICY IF EXISTS "Folhas scoped by empresa" ON public.folhas_pagamento;
DROP POLICY IF EXISTS "Gestão de folha por cargo" ON public.folhas_pagamento;
DROP POLICY IF EXISTS "Leitura por empresa" ON public.folhas_pagamento;
DROP POLICY IF EXISTS "empresa_isolation_folhas" ON public.folhas_pagamento;
DROP POLICY IF EXISTS "folhas_pagamento_tenant_select" ON public.folhas_pagamento;
DROP POLICY IF EXISTS "tenant_folhas_pagamento" ON public.folhas_pagamento;

CREATE POLICY "folhas_rh_manage" ON public.folhas_pagamento
  FOR ALL TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));

CREATE POLICY "folhas_gestor_read" ON public.folhas_pagamento
  FOR SELECT TO authenticated
  USING (public.pode_gerir_pessoas(empresa_id));

-- ============================================================
-- registros_ponto (so remove a policy redundante superada)
-- ============================================================
DROP POLICY IF EXISTS "empresa_isolation_ponto" ON public.registros_ponto;

-- ============================================================
-- integracao_logs (A-003 residual: unica policy viva era
-- "USING (true)" -- comentario original dizia "Ajustar conforme roles
-- futuras" e nunca foi ajustada)
-- ============================================================
DROP POLICY IF EXISTS "Apenas admin pode ver logs de integração" ON public.integracao_logs;

CREATE POLICY "integracao_logs_admin_read" ON public.integracao_logs
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============================================================
-- notificacoes_admissao (A-003 residual: "RH pode ver notificacoes" era
-- USING (true) e, por OR de policies PERMISSIVE, anulava a policy segura
-- "Tenant scoped notificacoes_admissao" -- que permanece intocada)
-- ============================================================
DROP POLICY IF EXISTS "RH pode ver notificacoes" ON public.notificacoes_admissao;
