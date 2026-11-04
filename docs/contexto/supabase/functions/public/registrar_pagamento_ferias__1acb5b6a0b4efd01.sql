CREATE OR REPLACE FUNCTION public.registrar_pagamento_ferias(p_ferias_id uuid, p_valor numeric, p_comprovante_path text DEFAULT NULL::text)
 RETURNS ferias
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.ferias;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.ferias WHERE id = p_ferias_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FERIAS_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Isolamento multi-tenant + role
  IF NOT public.user_belongs_to_empresa(v_uid, v_row.empresa_id)
     OR NOT (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'rh')) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF v_row.pagamento_confirmado_em IS NOT NULL THEN
    RAISE EXCEPTION 'PAGAMENTO_JA_CONFIRMADO' USING ERRCODE = '23505';
  END IF;

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'VALOR_INVALIDO' USING ERRCODE = '22023';
  END IF;

  UPDATE public.ferias
     SET pagamento_confirmado_em  = now(),
         pagamento_confirmado_por = v_uid,
         pagamento_valor          = p_valor,
         pagamento_comprovante_path = p_comprovante_path,
         data_pagamento           = COALESCE(data_pagamento, CURRENT_DATE)
   WHERE id = p_ferias_id
   RETURNING * INTO v_row;

  -- Auditoria unificada (best-effort)
  BEGIN
    INSERT INTO public.audit_log_unified (empresa_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (v_row.empresa_id, v_uid, 'FERIAS_PAGAMENTO_CONFIRMADO', 'ferias', v_row.id,
      jsonb_build_object('valor', p_valor, 'data_inicio', v_row.data_inicio,
                         'dias_antecedencia', (v_row.data_inicio - CURRENT_DATE)));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_row;
END;
$function$
