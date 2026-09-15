-- P0: remove user_empresas from generic service-role bridge access.
--
-- The generic bridge mutates tables through a service-key client. Its RLS
-- policies cannot therefore authorize user_empresas directly. These routines
-- are the only allowed paths for membership reads, own-default selection and
-- administrator-managed association.

DO $preflight$
DECLARE
  missing_columns text[];
BEGIN
  IF to_regclass('public.user_empresas') IS NULL THEN
    RAISE EXCEPTION 'P0 bridge membership authorization requires public.user_empresas';
  END IF;

  SELECT array_agg(column_name ORDER BY column_name)
    INTO missing_columns
  FROM unnest(ARRAY['id', 'user_id', 'empresa_id', 'is_default', 'created_at']) AS expected(column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.user_empresas'::regclass
      AND attname = expected.column_name
      AND NOT attisdropped
  );
  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'P0 bridge membership authorization missing user_empresas columns: %', array_to_string(missing_columns, ', ');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.user_empresas'::regclass
      AND contype = 'u'
      AND conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.user_empresas'::regclass AND attname = 'user_id' AND NOT attisdropped),
        (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.user_empresas'::regclass AND attname = 'empresa_id' AND NOT attisdropped)
      ]::smallint[]
  ) THEN
    RAISE EXCEPTION 'P0 bridge membership authorization requires UNIQUE(user_id, empresa_id) on public.user_empresas';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_empresas
    WHERE is_default IS TRUE
    GROUP BY user_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'P0 bridge membership authorization found multiple default companies for one user';
  END IF;
END
$preflight$;

-- The RPCs serialize cooperating callers, while this partial unique index
-- protects the invariant against every writer (including service jobs).
CREATE UNIQUE INDEX IF NOT EXISTS user_empresas_one_default_per_user
  ON public.user_empresas (user_id)
  WHERE is_default IS TRUE;

CREATE OR REPLACE FUNCTION public.get_my_user_empresas()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  empresa_id uuid,
  is_default boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT ue.id, ue.user_id, ue.empresa_id, COALESCE(ue.is_default, false), ue.created_at
  FROM public.user_empresas ue
  WHERE ue.user_id = auth.uid()
  ORDER BY ue.created_at ASC, ue.id ASC
$function$;

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

  -- Serializes competing tabs/devices. A hash collision merely serializes two
  -- unrelated users; it cannot weaken the membership check below.
  PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text));

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_empresas ue
    WHERE ue.user_id = v_user_id
      AND ue.empresa_id = p_empresa_id
  ) THEN
    RAISE EXCEPTION 'Empresa não vinculada ao usuário autenticado' USING ERRCODE = '42501';
  END IF;

  UPDATE public.user_empresas
  SET is_default = false
  WHERE user_id = v_user_id
    AND is_default IS TRUE;

  UPDATE public.user_empresas
  SET is_default = true
  WHERE user_id = v_user_id
    AND empresa_id = p_empresa_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_associar_usuario_empresa(
  p_user_id uuid,
  p_empresa_id uuid,
  p_is_default boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  empresa_id uuid,
  is_default boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
#variable_conflict use_column
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem associar usuários a empresas' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  IF p_is_default THEN
    UPDATE public.user_empresas AS ue
    SET is_default = false
    WHERE ue.user_id = p_user_id
      AND ue.is_default IS TRUE;
  END IF;

  RETURN QUERY
  INSERT INTO public.user_empresas AS ue (user_id, empresa_id, is_default)
  VALUES (p_user_id, p_empresa_id, p_is_default)
  ON CONFLICT (user_id, empresa_id) DO UPDATE
  SET is_default = CASE
    WHEN p_is_default THEN true
    ELSE ue.is_default
  END
  RETURNING ue.id, ue.user_id, ue.empresa_id, COALESCE(ue.is_default, false), ue.created_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_user_empresas() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_own_default_empresa(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_associar_usuario_empresa(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_user_empresas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_own_default_empresa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_associar_usuario_empresa(uuid, uuid, boolean) TO authenticated;

COMMENT ON FUNCTION public.get_my_user_empresas() IS
  'Retorna somente os próprios vínculos; caminho de leitura permitido após user_empresas sair da superfície genérica do bridge.';
COMMENT ON FUNCTION public.set_own_default_empresa(uuid) IS
  'Define atômica e exclusivamente a empresa padrão do auth.uid(); não aceita user_id do chamador.';
COMMENT ON FUNCTION public.admin_associar_usuario_empresa(uuid, uuid, boolean) IS
  'Associa usuário a empresa somente para admin autenticado; mantém no máximo uma empresa padrão por usuário em chamadas concorrentes.';
