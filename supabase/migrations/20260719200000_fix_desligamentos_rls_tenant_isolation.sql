-- Fix desligamentos RLS: replace USING(auth.role()='authenticated') with empresa-scoped policy.
-- The table has empresa_id (added in 20251228000000 / 20251220140409).
-- user_roles maps users to their empresa(s); we scope SELECT/UPDATE/DELETE to that set.

-- Helper function: returns set of empresa_ids the current user belongs to.
-- Wrapper around get_user_empresas for zero-arg convenience in RLS policies.
CREATE OR REPLACE FUNCTION public.get_user_empresa_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid();
$$;

-- Replace all four desligamentos policies with empresa-scoped equivalents.

DROP POLICY IF EXISTS "Authenticated users can view desligamentos" ON public.desligamentos;
CREATE POLICY "desligamentos_select_by_empresa"
  ON public.desligamentos FOR SELECT
  USING (empresa_id IN (SELECT public.get_user_empresa_ids()));

DROP POLICY IF EXISTS "Authenticated users can insert desligamentos" ON public.desligamentos;
CREATE POLICY "desligamentos_insert_by_empresa"
  ON public.desligamentos FOR INSERT
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresa_ids()));

DROP POLICY IF EXISTS "Authenticated users can update desligamentos" ON public.desligamentos;
CREATE POLICY "desligamentos_update_by_empresa"
  ON public.desligamentos FOR UPDATE
  USING  (empresa_id IN (SELECT public.get_user_empresa_ids()))
  WITH CHECK (empresa_id IN (SELECT public.get_user_empresa_ids()));

DROP POLICY IF EXISTS "Authenticated users can delete desligamentos" ON public.desligamentos;
CREATE POLICY "desligamentos_delete_by_empresa"
  ON public.desligamentos FOR DELETE
  USING (empresa_id IN (SELECT public.get_user_empresa_ids()));

-- Also fix homologacoes_rescisao: scope through desligamentos.empresa_id
DROP POLICY IF EXISTS "Acesso homologacoes por empresa" ON public.homologacoes_rescisao;
CREATE POLICY "homologacoes_rescisao_by_empresa"
  ON public.homologacoes_rescisao FOR ALL
  USING (
    desligamento_id IN (
      SELECT id FROM public.desligamentos
      WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
    )
  )
  WITH CHECK (
    desligamento_id IN (
      SELECT id FROM public.desligamentos
      WHERE empresa_id IN (SELECT public.get_user_empresa_ids())
    )
  );

-- Index to make the RLS subquery fast (empresa_id already indexed from prior migrations,
-- but user_roles lookup also needs an index).
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
