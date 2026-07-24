-- ============================================================================
-- P0-003: Padroniza leitura de empresa_id em policies
-- ----------------------------------------------------------------------------
-- Migrações usavam `(auth.jwt()->>'empresa_id')::uuid` (caminho top-level)
-- inconsistente com `public.user_empresa_id()` (que agora lê app_metadata).
-- Padronização: usar a helper function como ÚNICA porta de entrada.
-- ============================================================================

-- Cria helper canônica (se ainda não existir) com assinatura final
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
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

GRANT EXECUTE ON FUNCTION public.get_auth_empresa_id() TO authenticated, anon;

-- Substitui inline `(auth.jwt()->>'empresa_id')::uuid` por `get_auth_empresa_id()`
-- nas migrations críticas. (As migrations aplicadas antes não podem ser
-- editadas retroativamente sem rollback — então criamos uma nova que reescreve
-- as policies das tabelas envolvidas.)

-- Tabelas afetadas pelas 4 migrations que usavam path inconsistente:
-- provisoes_folha, historico_calculos_folha, guias_impostos, etc.

DROP POLICY IF EXISTS "Visualização por empresa provisoes" ON public.provisoes_folha;
CREATE POLICY "Visualização por empresa provisoes" ON public.provisoes_folha
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_auth_empresa_id());

DROP POLICY IF EXISTS "Acesso por empresa historico" ON public.historico_calculos_folha;
CREATE POLICY "Acesso por empresa historico" ON public.historico_calculos_folha
  FOR SELECT TO authenticated
  USING (empresa_id = public.get_auth_empresa_id());

DROP POLICY IF EXISTS "Inserção por empresa historico" ON public.historico_calculos_folha;
CREATE POLICY "Inserção por empresa historico" ON public.historico_calculos_folha
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- Comentário
COMMENT ON FUNCTION public.get_auth_empresa_id() IS
  '[P0-003] Helper canônica para tenant isolation. ' ||
  'SEMPRE preferir esta função a paths inline no JWT. ' ||
  'Lê de app_metadata (imutável pelo usuário, só service_role).';
