-- P0: corrige o achado do próprio gate audit-db-search-path.mjs (agora
-- rodando em PR graças a E50-46) — admin_definir_pin_quiosque e
-- verificar_pin_quiosque chamam crypt()/gen_salt() de pgcrypto, que vive no
-- schema `extensions` neste projeto, mas o SET search_path das duas
-- funções (20260924160000) só tinha pg_catalog, public, pg_temp. Sem o
-- schema da extensão, as duas quebrariam com "function crypt(...) does not
-- exist" na primeira chamada real em produção.

CREATE OR REPLACE FUNCTION public.admin_definir_pin_quiosque(p_colaborador_id uuid, p_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions, pg_temp
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
$function$;

CREATE OR REPLACE FUNCTION public.verificar_pin_quiosque(p_colaborador_id uuid, p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions, pg_temp
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
$function$;
