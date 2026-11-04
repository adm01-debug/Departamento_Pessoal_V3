CREATE OR REPLACE FUNCTION public.admin_definir_pin_quiosque(p_colaborador_id uuid, p_pin text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_empresa_id uuid;
BEGIN
  SELECT empresa_id INTO v_empresa_id FROM public.colaboradores WHERE id = p_colaborador_id;
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'colaborador não encontrado';
  END IF;
  IF NOT public.pode_gerir_rh(v_empresa_id) THEN
    RAISE EXCEPTION 'sem permissão para definir PIN deste colaborador';
  END IF;
  IF p_pin !~ '^[0-9]{4,6}$' THEN
    RAISE EXCEPTION 'PIN deve ter de 4 a 6 dígitos numéricos';
  END IF;

  INSERT INTO public.colaboradores_pin (colaborador_id, pin_hash, failed_attempts, locked_until, updated_by)
  VALUES (p_colaborador_id, crypt(p_pin, gen_salt('bf')), 0, NULL, auth.uid())
  ON CONFLICT (colaborador_id) DO UPDATE
    SET pin_hash = excluded.pin_hash,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = now(),
        updated_by = auth.uid();
END;
$function$
