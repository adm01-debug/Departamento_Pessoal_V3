-- =============================================================================
-- P0 — helper rls_tenant_or_admin ausente no canônico (drift de schema)
--
-- A migration 20260719240000 (batch RLS jul/2026) definia esta função, mas
-- ela é anterior ao baseline canônico (31/08) e nunca foi aplicada lá —
-- pg_proc do canônico não contém rls_tenant_or_admin. A migration
-- 20261002103000_p0_fix_audit_critical_gaps cria policy que referencia a
-- função → explode o batch de apply no canônico e faz rollback de todas as
-- correções P0 da mesma rodada.
--
-- Este arquivo tem versão anterior à 20261002103000 justamente para ser
-- aplicada ANTES dela (ordenação por versão). CREATE OR REPLACE = idempotente
-- nos ambientes onde a função já existe.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rls_tenant_or_admin(row_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_belongs_to_empresa(auth.uid(), row_empresa_id)
      OR public.is_admin(auth.uid());
$$;
