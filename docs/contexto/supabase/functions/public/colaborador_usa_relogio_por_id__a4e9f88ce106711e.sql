CREATE OR REPLACE FUNCTION public.colaborador_usa_relogio_por_id(_colaborador_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa_id uuid;
  v_user_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão obrigatória' USING ERRCODE = '42501';
  END IF;

  SELECT c.empresa_id, c.user_id INTO v_empresa_id, v_user_id
  FROM public.colaboradores c
  WHERE c.id = _colaborador_id;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado' USING ERRCODE = '42501';
  END IF;

  -- COALESCE: qualquer termo NULL (ex.: user_id vazio) conta como "não".
  IF NOT COALESCE(public.sou_o_colaborador(_colaborador_id)
                  OR (v_user_id IS NOT NULL AND v_user_id = auth.uid())
                  OR public.pode_gerir_rh(v_empresa_id)
                  OR public.pode_gerir_pessoas(v_empresa_id), false) THEN
    RAISE EXCEPTION 'Sem permissão para consultar este colaborador' USING ERRCODE = '42501';
  END IF;

  RETURN public.ponto_rep_colaborador_usa_relogio(_colaborador_id);
END;
$function$
