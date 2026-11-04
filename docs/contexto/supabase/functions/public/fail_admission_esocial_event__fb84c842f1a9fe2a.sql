CREATE OR REPLACE FUNCTION public.fail_admission_esocial_event(p_admissao_id uuid, p_empresa_id uuid, p_evento_id uuid, p_claim_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.pode_gerir_rh(p_empresa_id) THEN
    RAISE EXCEPTION 'not authorized to fail admission eSocial event' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.admissoes AS a
  WHERE a.id = p_admissao_id AND a.empresa_id = p_empresa_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('state', 'not_recorded');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.admissoes a
    WHERE a.id=p_admissao_id AND a.empresa_id=p_empresa_id AND a.status_esocial='enviado'
  ) THEN
    RETURN jsonb_build_object('state', 'already_sent');
  END IF;

  UPDATE public.admissoes AS a
  SET status_esocial = 'erro',
      metadata = COALESCE(a.metadata, '{}'::jsonb) || jsonb_build_object(
        'esocial_event_id', p_evento_id,
        'esocial_last_error_at', now()
      ),
      updated_at = now()
  WHERE a.id = p_admissao_id
    AND a.empresa_id = p_empresa_id
    AND a.status_esocial IS DISTINCT FROM 'enviado'
    AND EXISTS (
      SELECT 1 FROM public.esocial_eventos e
      WHERE e.id = p_evento_id AND e.admissao_id = a.id AND e.empresa_id = p_empresa_id
        AND e.transmission_claim_token = p_claim_token
    );
  IF NOT FOUND THEN
    RETURN jsonb_build_object('state', 'not_recorded');
  END IF;

  UPDATE public.esocial_eventos
  SET status='erro', transmission_claim_token=NULL,
      transmission_claimed_at=NULL, updated_at=now()
  WHERE id=p_evento_id AND empresa_id=p_empresa_id
    AND transmission_claim_token=p_claim_token;
  RETURN jsonb_build_object('state', 'failed');
END
$function$
