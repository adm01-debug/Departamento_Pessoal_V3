CREATE OR REPLACE FUNCTION public.definir_tipo_dia_justificativa_relogio(_justificativa_id uuid, _tipo_dia text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessao obrigatoria' USING ERRCODE = '42501';
  END IF;

  SELECT j.empresa_id INTO v_empresa FROM public.ponto_rep_justificativas j WHERE j.id = _justificativa_id FOR UPDATE;
  IF NOT FOUND
     OR NOT public.pertence_a_empresa(v_empresa)
     OR NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh')) THEN
    RAISE EXCEPTION 'Sem permissao para alterar esta justificativa do relogio' USING ERRCODE = '42501';
  END IF;

  -- Valor inválido cai no CHECK ponto_rep_justificativas_tipo_dia_check (23514).
  UPDATE public.ponto_rep_justificativas
     SET tipo_dia = _tipo_dia,
         updated_at = now()
   WHERE id = _justificativa_id;
END
$function$
