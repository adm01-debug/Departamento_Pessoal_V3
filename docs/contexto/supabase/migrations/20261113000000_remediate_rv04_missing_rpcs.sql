-- Migration: Remediação RV-04 — RPCs de vínculo/autorização ausentes no canonical DB
-- Aplica as funções definidas originalmente em 20260911200000 e 20260912190000
-- que ainda não foram executadas no projeto frjbfeamybqsejlvmqbl.
-- Idempotente: usa CREATE OR REPLACE FUNCTION em todos os casos.

-- ============================================================
-- 1. get_my_user_empresas() — sem parâmetros
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_user_empresas()
RETURNS TABLE (
  id          uuid,
  user_id     uuid,
  empresa_id  uuid,
  is_default  boolean,
  created_at  timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT
    ue.id,
    ue.user_id,
    ue.empresa_id,
    COALESCE(ue.is_default, false),
    ue.created_at
  FROM public.user_empresas ue
  WHERE ue.user_id = auth.uid()
  ORDER BY ue.created_at ASC, ue.id ASC
$function$;

REVOKE ALL ON FUNCTION public.get_my_user_empresas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_user_empresas() TO authenticated;

-- ============================================================
-- 2. set_own_default_empresa(uuid)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_own_default_empresa(p_empresa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  IF NOT EXISTS (
    SELECT 1 FROM public.user_empresas ue
    WHERE ue.user_id = v_user_id AND ue.empresa_id = p_empresa_id
  ) THEN
    RAISE EXCEPTION 'Empresa não vinculada ao usuário autenticado' USING ERRCODE = '42501';
  END IF;

  UPDATE public.user_empresas
    SET is_default = false
    WHERE user_id = v_user_id AND is_default IS TRUE;

  UPDATE public.user_empresas
    SET is_default = true
    WHERE user_id = v_user_id AND empresa_id = p_empresa_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_own_default_empresa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_own_default_empresa(uuid) TO authenticated;

-- ============================================================
-- 3. admin_associar_usuario_empresa(uuid, uuid, boolean)
-- Assinatura de 3 parâmetros — probe verifica (uuid,uuid,boolean)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_associar_usuario_empresa(
  p_user_id    uuid,
  p_empresa_id uuid,
  p_is_default boolean DEFAULT false
)
RETURNS TABLE (
  id          uuid,
  user_id     uuid,
  empresa_id  uuid,
  is_default  boolean,
  created_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
#variable_conflict use_column
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem associar usuários a empresas'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  IF p_is_default THEN
    UPDATE public.user_empresas AS ue
      SET is_default = false
      WHERE ue.user_id = p_user_id AND ue.is_default IS TRUE;
  END IF;

  RETURN QUERY
  INSERT INTO public.user_empresas AS ue (user_id, empresa_id, is_default)
    VALUES (p_user_id, p_empresa_id, p_is_default)
  ON CONFLICT (user_id, empresa_id) DO UPDATE
    SET is_default = CASE WHEN p_is_default THEN true ELSE ue.is_default END
  RETURNING
    ue.id,
    ue.user_id,
    ue.empresa_id,
    COALESCE(ue.is_default, false),
    ue.created_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_associar_usuario_empresa(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_associar_usuario_empresa(uuid, uuid, boolean) TO authenticated;

-- ============================================================
-- 4. pode_gerir_rh_para(uuid, uuid)
-- ============================================================
CREATE OR REPLACE FUNCTION public.pode_gerir_rh_para(
  _user_id    uuid,
  _empresa_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT
    _user_id IS NOT NULL
    AND _empresa_id IS NOT NULL
    AND (
      public.is_admin(_user_id)
      OR (
        EXISTS (
          SELECT 1 FROM public.user_empresas AS ue
          WHERE ue.user_id = _user_id AND ue.empresa_id = _empresa_id
        )
        AND public.has_role(_user_id, 'rh'::public.app_role)
      )
    )
$function$;

REVOKE ALL ON FUNCTION public.pode_gerir_rh_para(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pode_gerir_rh_para(uuid, uuid) TO service_role;

-- ============================================================
-- 5. pode_gerir_pessoas_para(uuid, uuid)
-- ============================================================
CREATE OR REPLACE FUNCTION public.pode_gerir_pessoas_para(
  _user_id    uuid,
  _empresa_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT
    _user_id IS NOT NULL
    AND _empresa_id IS NOT NULL
    AND (
      public.is_admin(_user_id)
      OR (
        EXISTS (
          SELECT 1 FROM public.user_empresas AS ue
          WHERE ue.user_id = _user_id AND ue.empresa_id = _empresa_id
        )
        AND (
          public.has_role(_user_id, 'rh'::public.app_role)
          OR public.has_role(_user_id, 'gestor'::public.app_role)
        )
      )
    )
$function$;

REVOKE ALL ON FUNCTION public.pode_gerir_pessoas_para(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pode_gerir_pessoas_para(uuid, uuid) TO service_role;
