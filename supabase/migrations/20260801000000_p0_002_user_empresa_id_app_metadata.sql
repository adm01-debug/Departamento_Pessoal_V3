-- ============================================================================
-- P0-002: user_empresa_id() lê de app_metadata (não-user-mutable)
-- ----------------------------------------------------------------------------
-- Vetor original: user_metadata pode ser alterado pelo próprio usuário via
-- supabase.auth.updateUser({ data: { empresa_id: 'outra' } }), permitindo
-- privilege escalation cross-tenant.
-- Correção: ler de app_metadata, que SÓ pode ser modificado com service_role.
-- + SET search_path = public (P0-006 - mesmo batch).
-- + Guard contra JWT malformado (PGRST falha graceful).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_empresa_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::jsonb
      -> 'app_metadata' ->> 'empresa_id',
    ''
  )::UUID;
$$;

-- Comentário de auditoria
COMMENT ON FUNCTION public.user_empresa_id() IS
  '[P0-002] Lê empresa_id de app_metadata (somente service_role pode modificar). '
  'Substitui leitura de user_metadata que permitia privilege escalation.';

-- Re-grant explícito
GRANT EXECUTE ON FUNCTION public.user_empresa_id() TO authenticated, anon;
