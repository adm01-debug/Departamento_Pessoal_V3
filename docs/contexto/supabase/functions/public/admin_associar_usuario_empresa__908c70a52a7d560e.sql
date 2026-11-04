CREATE OR REPLACE FUNCTION public.admin_associar_usuario_empresa(p_user_id uuid, p_empresa_id uuid, p_is_default boolean DEFAULT false)
 RETURNS TABLE(id uuid, user_id uuid, empresa_id uuid, is_default boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
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
$function$
