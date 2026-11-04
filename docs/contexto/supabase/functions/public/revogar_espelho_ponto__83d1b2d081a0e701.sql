CREATE OR REPLACE FUNCTION public.revogar_espelho_ponto(_espelho_id uuid, _motivo text, _ip inet DEFAULT NULL::inet, _user_agent text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem revogar assinaturas';
  END IF;

  IF _motivo IS NULL OR length(trim(_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mín. 5 caracteres)';
  END IF;

  INSERT INTO public.ponto_espelhos_revogacoes (
    espelho_id, revogado_por_user_id, motivo, ip, user_agent
  ) VALUES (_espelho_id, auth.uid(), _motivo, _ip, _user_agent);

  UPDATE public.ponto_espelhos_assinados
  SET revogado_em = now()
  WHERE id = _espelho_id AND revogado_em IS NULL;

  RETURN jsonb_build_object('success', true, 'espelho_id', _espelho_id);
END;
$function$
