CREATE OR REPLACE FUNCTION public.registrar_comunicado_ferias_coletivas(_coletiva_id uuid, _mte_path text, _mte_hash text, _sindicato_path text, _sindicato_hash text, _sindicato_nome text)
 RETURNS ferias_coletivas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.ferias_coletivas;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.ferias_coletivas WHERE id = _coletiva_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Férias coletivas não encontradas' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.user_belongs_to_empresa(auth.uid(), v_row.empresa_id) THEN
    RAISE EXCEPTION 'Sem acesso a essa empresa' USING ERRCODE = '42501';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'rh'::app_role)) THEN
    RAISE EXCEPTION 'Apenas RH ou Admin podem gerar comunicados' USING ERRCODE = '42501';
  END IF;

  UPDATE public.ferias_coletivas SET
    comunicado_mte_path       = _mte_path,
    comunicado_mte_hash       = _mte_hash,
    comunicado_sindicato_path = _sindicato_path,
    comunicado_sindicato_hash = _sindicato_hash,
    comunicado_sindicato_nome = _sindicato_nome,
    comunicado_gerado_em      = now(),
    comunicado_gerado_por     = auth.uid(),
    updated_at                = now()
  WHERE id = _coletiva_id
  RETURNING * INTO v_row;

  INSERT INTO public.audit_log_unified (
    empresa_id, entity, entity_id, action, actor_id, metadata
  ) VALUES (
    v_row.empresa_id, 'ferias_coletivas', v_row.id, 'comunicado_gerado', auth.uid(),
    jsonb_build_object('mte_hash', _mte_hash, 'sindicato_hash', _sindicato_hash, 'sindicato_nome', _sindicato_nome)
  );

  RETURN v_row;
END $function$
