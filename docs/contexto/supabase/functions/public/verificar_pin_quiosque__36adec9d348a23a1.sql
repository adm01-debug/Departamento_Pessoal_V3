CREATE OR REPLACE FUNCTION public.verificar_pin_quiosque(p_colaborador_id uuid, p_pin text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_row public.colaboradores_pin%ROWTYPE;
  v_ok boolean;
BEGIN
  SELECT * INTO v_row FROM public.colaboradores_pin WHERE colaborador_id = p_colaborador_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > now() THEN
    RAISE EXCEPTION 'PIN_BLOQUEADO' USING ERRCODE = 'P0001';
  END IF;

  v_ok := (crypt(p_pin, v_row.pin_hash) = v_row.pin_hash);

  IF v_ok THEN
    UPDATE public.colaboradores_pin
      SET failed_attempts = 0, locked_until = NULL
      WHERE colaborador_id = p_colaborador_id;
  ELSE
    UPDATE public.colaboradores_pin
      SET failed_attempts = failed_attempts + 1,
          locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN now() + interval '5 minutes' ELSE NULL END
      WHERE colaborador_id = p_colaborador_id;
  END IF;

  RETURN v_ok;
END;
$function$
