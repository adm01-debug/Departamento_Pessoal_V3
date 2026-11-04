CREATE OR REPLACE FUNCTION public.complete_admission_esocial_event(p_admissao_id uuid, p_empresa_id uuid, p_evento_id uuid, p_claim_token uuid, p_protocolo text, p_recibo text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  actor uuid := auth.uid();
  receipt text := COALESCE(NULLIF(btrim(p_protocolo), ''), NULLIF(btrim(p_recibo), ''));
  admission_status text;
  persisted_status text;
  persisted_protocol text;
  persisted_receipt text;
BEGIN
  IF actor IS NULL OR NOT public.pode_gerir_rh(p_empresa_id) THEN
    RAISE EXCEPTION 'not authorized to complete admission eSocial event' USING ERRCODE = '42501';
  END IF;
  -- Every lifecycle writer locks admission first and event second. This avoids
  -- a stale token check racing with fail/reclaim and completing a newer lease.
  SELECT status_esocial INTO admission_status
  FROM public.admissoes
  WHERE id = p_admissao_id AND empresa_id = p_empresa_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'admission not found in company' USING ERRCODE = 'P0002'; END IF;

  SELECT status, protocolo, recibo
  INTO persisted_status, persisted_protocol, persisted_receipt
  FROM public.esocial_eventos
  WHERE id = p_evento_id AND admissao_id = p_admissao_id
    AND empresa_id = p_empresa_id AND tipo_evento = 'S-2200'
  FOR UPDATE;
  IF NOT FOUND OR receipt IS NULL THEN
    RAISE EXCEPTION 'invalid admission eSocial completion' USING ERRCODE = '23514';
  END IF;

  -- A lost HTTP response after a committed completion is safe to retry.
  IF admission_status = 'enviado' THEN RETURN; END IF;
  IF persisted_status <> 'enviado'
     OR NULLIF(btrim(persisted_protocol), '') IS DISTINCT FROM NULLIF(btrim(p_protocolo), '')
     OR NULLIF(btrim(persisted_receipt), '') IS DISTINCT FROM NULLIF(btrim(p_recibo), '') THEN
    RAISE EXCEPTION 'eSocial completion requires matching persisted transport receipt'
      USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.esocial_eventos
    WHERE id = p_evento_id AND empresa_id = p_empresa_id
      AND transmission_claim_token = p_claim_token
  ) THEN
    RAISE EXCEPTION 'invalid admission eSocial completion' USING ERRCODE = '23514';
  END IF;

  UPDATE public.admissoes
  SET etapa = 'esocial',
      checklist_esocial_enviado = true,
      status_esocial = 'enviado',
      protocolo_esocial = receipt,
      data_transmissao_esocial = now(),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
        'esocial_event_id', p_evento_id,
        'esocial_protocol', NULLIF(btrim(p_protocolo), ''),
        'esocial_receipt', NULLIF(btrim(p_recibo), '')
      )),
      updated_at = now()
  WHERE id = p_admissao_id;

  UPDATE public.esocial_eventos
  SET transmission_claim_token = NULL, transmission_claimed_at = NULL
  WHERE id = p_evento_id AND empresa_id = p_empresa_id
    AND transmission_claim_token = p_claim_token;

  IF to_regclass('public.audit_log_unified') IS NOT NULL THEN
    INSERT INTO public.audit_log_unified(
      source_table, empresa_id, user_id, action, entity, entity_id, payload, occurred_at
    ) VALUES (
      'app', p_empresa_id, actor, 'ESOCIAL_ADMISSION_COMPLETE', 'admissoes', p_admissao_id::text,
      jsonb_build_object('evento_id', p_evento_id, 'protocolo', NULLIF(btrim(p_protocolo), ''), 'recibo', NULLIF(btrim(p_recibo), '')),
      now()
    );
  END IF;
END
$function$
