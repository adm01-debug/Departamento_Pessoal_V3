CREATE OR REPLACE FUNCTION public.set_own_default_empresa(p_empresa_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
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
$function$
