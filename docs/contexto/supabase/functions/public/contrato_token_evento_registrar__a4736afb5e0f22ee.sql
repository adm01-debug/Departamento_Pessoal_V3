CREATE OR REPLACE FUNCTION public.contrato_token_evento_registrar(p_token_id uuid, p_evento text, p_detalhes jsonb DEFAULT '{}'::jsonb, p_ip inet DEFAULT NULL::inet, p_ua text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa UUID;
  v_contrato UUID;
  v_id UUID;
BEGIN
  SELECT empresa_id, contrato_id INTO v_empresa, v_contrato
  FROM public.contrato_assinatura_tokens WHERE id = p_token_id;
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Token % não encontrado', p_token_id;
  END IF;

  INSERT INTO public.contrato_token_eventos(
    empresa_id, token_id, contrato_id, evento, detalhes, ator_id, ip, user_agent
  ) VALUES (
    v_empresa, p_token_id, v_contrato, p_evento,
    COALESCE(p_detalhes, '{}'::jsonb), auth.uid(), p_ip, p_ua
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$
