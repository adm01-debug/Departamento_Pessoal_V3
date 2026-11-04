CREATE OR REPLACE FUNCTION public.assinar_desligamento(_desligamento_id uuid, _parte text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  v_row public.desligamentos%ROWTYPE;
  v_canonical TEXT;
  v_hash TEXT;
BEGIN
  IF _parte NOT IN ('empresa', 'colaborador') THEN
    RAISE EXCEPTION 'Parte invalida: % (use empresa ou colaborador)', _parte USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem confirmar assinatura de rescisao' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.desligamentos WHERE id = _desligamento_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Desligamento nao encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.status NOT IN ('calculado', 'em_homologacao') THEN
    RAISE EXCEPTION 'Rescisao precisa estar calculada e ainda nao homologada (status atual: %)', v_row.status
      USING ERRCODE = 'check_violation';
  END IF;
  IF (_parte = 'empresa' AND v_row.assinado_empresa) OR (_parte = 'colaborador' AND v_row.assinado_colaborador) THEN
    RAISE EXCEPTION 'Esta parte ja assinou esta rescisao' USING ERRCODE = 'check_violation';
  END IF;

  v_canonical := COALESCE(v_row.colaborador_id::text,'') || '|' || COALESCE(v_row.empresa_id::text,'') || '|' ||
                 COALESCE(v_row.valor_liquido::text,'0') || '|' || _parte || '|' || auth.uid()::text || '|' || clock_timestamp()::text;
  v_hash := encode(digest(v_canonical, 'sha256'), 'hex');

  PERFORM set_config('app.allow_signature_write', 'true', true);

  IF _parte = 'empresa' THEN
    UPDATE public.desligamentos
    SET assinado_empresa = true, hash_assinatura_empresa = v_hash, data_assinatura_empresa = now()
    WHERE id = _desligamento_id;
  ELSE
    UPDATE public.desligamentos
    SET assinado_colaborador = true, hash_assinatura_colaborador = v_hash, data_assinatura_colaborador = now()
    WHERE id = _desligamento_id;
  END IF;

  INSERT INTO public.audit_log (tabela, registro_id, acao, user_id, dados_novos)
  VALUES ('desligamentos', _desligamento_id, 'UPDATE', auth.uid(),
          jsonb_build_object('action','assinar_desligamento','parte',_parte,'hash',v_hash));

  RETURN TRUE;
END;
$function$
