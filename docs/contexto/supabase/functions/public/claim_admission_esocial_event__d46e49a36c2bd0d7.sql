CREATE OR REPLACE FUNCTION public.claim_admission_esocial_event(p_admissao_id uuid, p_empresa_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  actor uuid := auth.uid();
  admission public.admissoes%ROWTYPE;
  event_id uuid;
  event_status text;
  event_claim_token uuid;
  event_claimed_at timestamptz;
  claim_token uuid := gen_random_uuid();
  was_created boolean := false;
BEGIN
  IF actor IS NULL OR NOT public.pode_gerir_rh(p_empresa_id) THEN
    RAISE EXCEPTION 'not authorized to claim admission eSocial event' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO admission
  FROM public.admissoes
  WHERE id = p_admissao_id AND empresa_id = p_empresa_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'admission not found in company' USING ERRCODE = 'P0002';
  END IF;
  IF admission.cpf IS NULL OR btrim(admission.cpf) = '' THEN
    RAISE EXCEPTION 'admission CPF is required' USING ERRCODE = '23514';
  END IF;

  SELECT id, status, transmission_claim_token, transmission_claimed_at
  INTO event_id, event_status, event_claim_token, event_claimed_at
  FROM public.esocial_eventos
  WHERE admissao_id = p_admissao_id AND tipo_evento = 'S-2200'
  FOR UPDATE;

  IF admission.status_esocial = 'enviado'
     AND event_id IS NOT NULL
     AND event_status IN ('enviado', 'processado') THEN
    RETURN jsonb_build_object('evento_id', event_id, 'state', 'already_sent', 'created', false);
  END IF;
  IF admission.status_esocial = 'enviado' THEN
    RAISE EXCEPTION 'inconsistent admission eSocial completion state' USING ERRCODE = '23514';
  END IF;
  IF event_claim_token IS NOT NULL
     AND event_claimed_at > now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'admission eSocial transmission already in progress' USING ERRCODE = '55000';
  END IF;

  IF event_id IS NULL THEN
    INSERT INTO public.esocial_eventos (
      empresa_id, admissao_id, tipo_evento, competencia, status, dados
    ) VALUES (
      p_empresa_id,
      p_admissao_id,
      'S-2200',
      to_char(current_date, 'YYYY-MM'),
      'processando',
      jsonb_strip_nulls(jsonb_build_object(
        'admissaoId', admission.id,
        'cpfTrab', admission.cpf,
        'nmTrab', admission.nome,
        'dtAdm', admission.data_prevista,
        'dtNascto', admission.data_nascimento
      ))
    ) RETURNING id INTO event_id;
    was_created := true;
  ELSE
    UPDATE public.esocial_eventos
    SET status = 'processando', transmission_claim_token = claim_token,
        transmission_claimed_at = now(), updated_at = now()
    WHERE id = event_id;
  END IF;

  IF was_created THEN
    UPDATE public.esocial_eventos
    SET transmission_claim_token = claim_token, transmission_claimed_at = now()
    WHERE id = event_id;
  END IF;

  UPDATE public.admissoes
  SET status_esocial = 'processando',
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('esocial_event_id', event_id),
      updated_at = now()
  WHERE id = p_admissao_id;

  RETURN jsonb_build_object(
    'evento_id', event_id, 'claim_token', claim_token,
    'state', 'claimed', 'created', was_created
  );
END
$function$
