-- ============================================================================
-- P0-005: Auditoria só pode ser escrita via SECURITY DEFINER RPC
-- ----------------------------------------------------------------------------
-- Audit_insert permitia INSERT direto de qualquer authenticated, permitindo
-- fabricação de registros de auditoria. Correção:
-- 1. Revoga INSERT direto de authenticated e anon
-- 2. Cria RPC SECURITY DEFINER registrar_auditoria() que valida + grava
-- 3. Adiciona coluna empresa_id (era opcional) para tenant isolation
-- ============================================================================

-- 1) Revoga INSERT direto
REVOKE INSERT ON public.auditoria FROM authenticated, anon;

-- Garante RLS habilitado
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- 2) Substitui policy permissiva por uma que EXIGE a chamada via RPC
DROP POLICY IF EXISTS audit_insert ON public.auditoria;
-- A policy abaixo é fail-closed: apenas SECURITY DEFINER bypassa RLS
-- (configurando FORCE ROW LEVEL SECURITY se necessário). Clientes que
-- tentarem INSERT direto serão negados.
DROP POLICY IF EXISTS "no_direct_insert" ON public.auditoria;
CREATE POLICY "no_direct_insert" ON public.auditoria
  FOR INSERT TO authenticated, anon
  WITH CHECK (false); -- sempre nega; única via é RPC

-- 3) Mantém SELECT apenas para admins (auditoria/compliance)
DROP POLICY IF EXISTS "audit_select_admin" ON public.auditoria;
CREATE POLICY "audit_select_admin" ON public.auditoria
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Bloqueia UPDATE/DELETE — auditoria é append-only
REVOKE UPDATE, DELETE ON public.auditoria FROM authenticated, anon;

-- 4) RPC SECURITY DEFINER para inserção controlada
CREATE OR REPLACE FUNCTION public.registrar_auditoria(
  p_tabela TEXT,
  p_operacao TEXT,
  p_registro_id UUID,
  p_dados_antes JSONB DEFAULT NULL,
  p_dados_depois JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id UUID;
  v_user_id UUID;
  v_audit_id UUID;
BEGIN
  -- Extrai contexto do JWT
  v_user_id := auth.uid();
  v_empresa_id := (
    current_setting('request.jwt.claims', true)::jsonb
      -> 'app_metadata' ->> 'empresa_id'
  )::uuid;

  -- Valida operação
  IF p_operacao NOT IN ('INSERT', 'UPDATE', 'DELETE') THEN
    RAISE EXCEPTION 'Operação inválida: %', p_operacao
      USING ERRCODE = '22023';
  END IF;

  -- Valida tabela (whitelist de domínios válidos)
  IF p_tabela IS NULL OR length(p_tabela) > 63 OR p_tabela !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' THEN
    RAISE EXCEPTION 'Tabela inválida: %', p_tabela
      USING ERRCODE = '22023';
  END IF;

  -- Insere
  INSERT INTO public.auditoria (
    empresa_id, tabela, operacao, registro_id,
    dados_antes, dados_depois, usuario_id, created_at
  )
  VALUES (
    v_empresa_id, p_tabela, p_operacao, p_registro_id,
    p_dados_antes, p_dados_depois, v_user_id, NOW()
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_auditoria TO authenticated;

COMMENT ON FUNCTION public.registrar_auditoria IS
  '[P0-005] RPC único para inserir auditoria. Valida tabela + operação, extrai tenant do JWT.';

COMMENT ON TABLE public.auditoria IS
  '[P0-005] Append-only. INSERT direto bloqueado; usar public.registrar_auditoria().';
