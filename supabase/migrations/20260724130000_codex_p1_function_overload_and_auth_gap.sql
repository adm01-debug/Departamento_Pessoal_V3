-- =============================================================================
-- Codex P1 — Fix function overload collision + contrato_estender_expiracao auth gap
--
-- P1-A: contrato_assinar_por_token overload collision
-- Migration 145602 defined the function with 5 params (3rd = p_nome_completo).
-- Migration 170000 redefined it with 7 params (3rd = p_nome) via CREATE OR REPLACE.
-- Because PostgreSQL overload resolution is based on argument types (not names),
-- both functions have (text, text, text, inet, text) as their leading type
-- signature. Any call with 3–5 positional args is AMBIGUOUS and PostgreSQL
-- returns: "ERROR: function contrato_assinar_por_token(...) is ambiguous".
-- Fix: DROP the orphaned 5-param overload.
--
-- P1-B: contrato_estender_expiracao(text, int, uuid) auth gap
-- Migration 170000 created this 3-param overload with SECURITY DEFINER but
-- without REVOKE ALL FROM PUBLIC or any auth.uid() guard. Any unauthenticated
-- caller who knows (token_string, empresa_uuid) can extend a token's expiry,
-- bypassing the company's contract lifecycle controls.
-- Fix: REVOKE from PUBLIC, add auth.uid() + role + empresa membership checks.
-- =============================================================================

-- ─── P1-A: Drop orphaned 5-param overload ───────────────────────────────────
-- The 7-param version (200000) is now the canonical implementation and handles
-- all use-cases of the old one. Callers using named params (p_nome_completo)
-- must be updated to use p_nome instead (done in 170000/200000 rewrites).
DROP FUNCTION IF EXISTS public.contrato_assinar_por_token(TEXT, TEXT, TEXT, INET, TEXT);

-- Also revoke grants that the 145602 migration applied to this overload
-- (grants on a dropped function are removed automatically, but being explicit):
-- [no-op after DROP — listed here for audit trail]

-- ─── P1-B: Lock down contrato_estender_expiracao(text, int, uuid) ───────────

-- Step 1: Revoke PUBLIC access introduced by the missing REVOKE in 170000.
REVOKE ALL ON FUNCTION public.contrato_estender_expiracao(text, int, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.contrato_estender_expiracao(text, int, uuid) FROM anon;

-- Step 2: Rewrite with auth guard (mirrors the security model of the 2-param
-- version in migration 150715: auth.uid() required, admin/rh/super_admin role,
-- and empresa membership via user_empresas).
CREATE OR REPLACE FUNCTION public.contrato_estender_expiracao(
  p_token   text,
  p_dias    int,
  p_empresa uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller  uuid  := auth.uid();
  v_role    text;
  v_hash    text;
  v_tok     record;
BEGIN
  -- Auth guard: session must be authenticated
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'não autenticado' USING ERRCODE = '42501';
  END IF;

  -- Role check: caller must hold admin, rh, or super_admin role
  SELECT ur.role::text INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = v_caller
    AND ur.role::text IN ('admin', 'rh', 'super_admin')
  LIMIT 1;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'perfil sem permissão para estender token' USING ERRCODE = '42501';
  END IF;

  -- Empresa membership check: caller must belong to the target empresa
  IF NOT EXISTS (
    SELECT 1 FROM public.user_empresas ue
    WHERE ue.user_id = v_caller AND ue.empresa_id = p_empresa
  ) THEN
    RAISE EXCEPTION 'sem acesso à empresa do token' USING ERRCODE = '42501';
  END IF;

  -- Input validation
  IF p_dias IS NULL OR p_dias < 1 OR p_dias > 30 THEN
    RAISE EXCEPTION 'p_dias deve ser entre 1 e 30 (informado: %).', p_dias;
  END IF;

  v_hash := encode(sha256(p_token::bytea), 'hex');

  SELECT * INTO v_tok
  FROM public.contrato_assinatura_tokens
  WHERE token_hash = v_hash AND empresa_id = p_empresa
  FOR UPDATE;

  IF v_tok IS NULL THEN
    RAISE EXCEPTION 'Token não encontrado ou não pertence à empresa informada.';
  END IF;

  -- C06 fix (preserved from 170000): block extension of revoked token
  IF v_tok.revogado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Não é possível estender token revogado (revogado em %).', v_tok.revogado_em;
  END IF;

  IF v_tok.usado_em IS NOT NULL THEN
    RAISE EXCEPTION 'Não é possível estender token já utilizado.';
  END IF;

  UPDATE public.contrato_assinatura_tokens
  SET expira_em = GREATEST(expira_em, now()) + (p_dias || ' days')::interval
  WHERE id = v_tok.id;

  RETURN jsonb_build_object(
    'success',        true,
    'token_id',       v_tok.id,
    'nova_expiracao', GREATEST(v_tok.expira_em, now()) + (p_dias || ' days')::interval
  );
END;
$$;

-- Step 3: Grant only to authenticated users
GRANT EXECUTE ON FUNCTION public.contrato_estender_expiracao(text, int, uuid) TO authenticated;

COMMENT ON FUNCTION public.contrato_estender_expiracao(text, int, uuid) IS
  'Extends contract signing token expiry. Requires authenticated session with '
  'admin/rh/super_admin role and membership in the target empresa. '
  'P1-B fix: added auth.uid() + role + empresa guards missing from 170000.';
