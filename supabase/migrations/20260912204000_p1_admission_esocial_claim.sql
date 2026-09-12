-- P1: serialize the admission -> S-2200 event lifecycle in PostgreSQL.
-- Frontend read/insert/update sequences allowed duplicate events and left an
-- admission in `processando` when transport failed.

DO $preflight$
BEGIN
  IF to_regclass('public.admissoes') IS NULL OR to_regclass('public.esocial_eventos') IS NULL THEN
    RAISE EXCEPTION 'admission eSocial claim requires public.admissoes and public.esocial_eventos';
  END IF;
  IF to_regprocedure('public.pode_gerir_rh(uuid)') IS NULL THEN
    RAISE EXCEPTION 'admission eSocial claim requires public.pode_gerir_rh(uuid)';
  END IF;
END
$preflight$;

ALTER TABLE public.esocial_eventos ADD COLUMN IF NOT EXISTS admissao_id uuid;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.esocial_eventos'::regclass
      AND conname = 'esocial_eventos_admissao_id_fkey'
  ) THEN
    ALTER TABLE public.esocial_eventos
      ADD CONSTRAINT esocial_eventos_admissao_id_fkey
      FOREIGN KEY (admissao_id) REFERENCES public.admissoes(id) ON DELETE SET NULL;
  END IF;
END
$constraint$;

-- Preserve at most the oldest valid historical S-2200 association. Duplicate
-- historical events remain available, but are not attached to the unique key.
WITH valid_candidates AS (
  SELECT
    e.id,
    CASE WHEN COALESCE(e.dados ->> 'admissaoId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (e.dados ->> 'admissaoId')::uuid END AS admissao_id,
    row_number() OVER (
      PARTITION BY e.dados ->> 'admissaoId'
      ORDER BY e.created_at, e.id
    ) AS position
  FROM public.esocial_eventos AS e
  JOIN public.admissoes AS a
    ON a.id = CASE WHEN COALESCE(e.dados ->> 'admissaoId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (e.dados ->> 'admissaoId')::uuid END
   AND a.empresa_id = e.empresa_id
  WHERE e.tipo_evento = 'S-2200'
    AND e.admissao_id IS NULL
    AND COALESCE(e.dados ->> 'admissaoId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND NOT EXISTS (
      SELECT 1 FROM public.esocial_eventos attached
      WHERE attached.admissao_id = a.id AND attached.tipo_evento = 'S-2200'
    )
)
UPDATE public.esocial_eventos AS e
SET admissao_id = candidate.admissao_id
FROM valid_candidates AS candidate
WHERE e.id = candidate.id AND candidate.position = 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_esocial_eventos_admissao_s2200
  ON public.esocial_eventos (admissao_id)
  WHERE admissao_id IS NOT NULL AND tipo_evento = 'S-2200';

CREATE OR REPLACE FUNCTION public.claim_admission_esocial_event(
  p_admissao_id uuid,
  p_empresa_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  actor uuid := auth.uid();
  admission public.admissoes%ROWTYPE;
  event_id uuid;
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

  SELECT id INTO event_id
  FROM public.esocial_eventos
  WHERE admissao_id = p_admissao_id AND tipo_evento = 'S-2200';

  IF event_id IS NULL THEN
    INSERT INTO public.esocial_eventos (
      empresa_id, admissao_id, tipo_evento, competencia, status, dados
    ) VALUES (
      p_empresa_id,
      p_admissao_id,
      'S-2200',
      to_char(current_date, 'YYYY-MM'),
      'pendente',
      jsonb_strip_nulls(jsonb_build_object(
        'admissaoId', admission.id,
        'cpfTrab', admission.cpf,
        'nmTrab', admission.nome,
        'dtAdm', admission.data_prevista,
        'dtNascto', admission.data_nascimento
      ))
    ) RETURNING id INTO event_id;
    was_created := true;
  END IF;

  UPDATE public.admissoes
  SET status_esocial = 'processando',
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('esocial_event_id', event_id),
      updated_at = now()
  WHERE id = p_admissao_id;

  RETURN jsonb_build_object('evento_id', event_id, 'created', was_created);
END
$function$;

CREATE OR REPLACE FUNCTION public.complete_admission_esocial_event(
  p_admissao_id uuid,
  p_empresa_id uuid,
  p_evento_id uuid,
  p_protocolo text,
  p_recibo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  actor uuid := auth.uid();
  receipt text := COALESCE(NULLIF(btrim(p_protocolo), ''), NULLIF(btrim(p_recibo), ''));
BEGIN
  IF actor IS NULL OR NOT public.pode_gerir_rh(p_empresa_id) THEN
    RAISE EXCEPTION 'not authorized to complete admission eSocial event' USING ERRCODE = '42501';
  END IF;
  IF receipt IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.esocial_eventos
    WHERE id = p_evento_id AND admissao_id = p_admissao_id
      AND empresa_id = p_empresa_id AND tipo_evento = 'S-2200'
  ) THEN
    RAISE EXCEPTION 'invalid admission eSocial completion' USING ERRCODE = '23514';
  END IF;

  PERFORM 1 FROM public.admissoes
  WHERE id = p_admissao_id AND empresa_id = p_empresa_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'admission not found in company' USING ERRCODE = 'P0002'; END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.fail_admission_esocial_event(
  p_admissao_id uuid,
  p_empresa_id uuid,
  p_evento_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.pode_gerir_rh(p_empresa_id) THEN
    RAISE EXCEPTION 'not authorized to fail admission eSocial event' USING ERRCODE = '42501';
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
    );
END
$function$;

REVOKE ALL ON FUNCTION public.claim_admission_esocial_event(uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_admission_esocial_event(uuid,uuid,uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fail_admission_esocial_event(uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admission_esocial_event(uuid,uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_admission_esocial_event(uuid,uuid,uuid,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fail_admission_esocial_event(uuid,uuid,uuid) TO authenticated, service_role;

-- The public contract-signing endpoint is part of the same admission
-- lifecycle. Consolidate the historical overloads and make a missing CPF fail
-- before SQL three-valued comparison can bypass the expected identity.
DROP FUNCTION IF EXISTS public.contrato_assinar_por_token(text,text,text,inet,text,text,text);

CREATE OR REPLACE FUNCTION public.contrato_assinar_por_token(
  p_token text,
  p_cpf text,
  p_nome_completo text,
  p_ip inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_token_hash text;
  cpf_normalized text := regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g');
  name_normalized text := btrim(COALESCE(p_nome_completo, ''));
  token_row public.contrato_assinatura_tokens%ROWTYPE;
  contract_row public.contratos_gerados%ROWTYPE;
  signature_hash text;
  signed_at timestamptz := clock_timestamp();
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 OR length(p_token) > 512 THEN
    RAISE EXCEPTION 'Token inválido' USING ERRCODE = '22023';
  END IF;
  IF length(cpf_normalized) <> 11 THEN
    RAISE EXCEPTION 'CPF inválido' USING ERRCODE = '22023';
  END IF;
  IF length(name_normalized) < 5 OR length(name_normalized) > 200
     OR name_normalized ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Nome completo inválido' USING ERRCODE = '22023';
  END IF;

  v_token_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  SELECT * INTO token_row
  FROM public.contrato_assinatura_tokens AS t
  WHERE t.token_hash = v_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Token não encontrado' USING ERRCODE = 'P0002'; END IF;
  IF token_row.revogado_em IS NOT NULL THEN RAISE EXCEPTION 'Token revogado' USING ERRCODE = '22023'; END IF;
  IF token_row.usado_em IS NOT NULL THEN RAISE EXCEPTION 'Token já utilizado' USING ERRCODE = '22023'; END IF;
  IF token_row.expira_em < now() THEN RAISE EXCEPTION 'Token expirado' USING ERRCODE = '22023'; END IF;
  IF token_row.tentativas >= 20 THEN RAISE EXCEPTION 'Muitas tentativas' USING ERRCODE = '22023'; END IF;

  IF token_row.cpf_esperado IS NOT NULL
     AND regexp_replace(token_row.cpf_esperado, '[^0-9]', '', 'g') <> cpf_normalized THEN
    UPDATE public.contrato_assinatura_tokens SET tentativas = tentativas + 1 WHERE id = token_row.id;
    -- Returning a controlled failure is intentional. Raising after the UPDATE
    -- would roll the attempt counter back with the statement, making the
    -- brute-force limit ineffective.
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_SIGNER',
      'message', 'Dados de assinatura inválidos'
    );
  END IF;

  SELECT * INTO contract_row FROM public.contratos_gerados
  WHERE id = token_row.contrato_id AND empresa_id = token_row.empresa_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrato não encontrado' USING ERRCODE = 'P0002'; END IF;

  signature_hash := encode(sha256(convert_to(
    COALESCE(contract_row.sha256, '') || cpf_normalized || upper(name_normalized) ||
    signed_at::text || COALESCE(p_ip::text, ''), 'UTF8'
  )), 'hex');

  UPDATE public.contrato_assinatura_tokens
  SET usado_em = signed_at,
      assinado_ip = p_ip,
      assinado_ua = left(p_user_agent, 1024),
      assinatura_hash = signature_hash,
      tentativas = tentativas + 1
  WHERE id = token_row.id;

  UPDATE public.contratos_gerados
  SET status = 'assinado', assinado_em = signed_at,
      assinatura_metadata = jsonb_build_object(
        'cpf', cpf_normalized, 'nome', upper(name_normalized),
        'ip', p_ip::text, 'user_agent', left(p_user_agent, 1024),
        'assinatura_hash', signature_hash, 'assinado_em', signed_at
      ),
      updated_at = now()
  WHERE id = contract_row.id;

  IF to_regclass('public.audit_log_unified') IS NOT NULL THEN
    INSERT INTO public.audit_log_unified(source_table, empresa_id, action, entity, entity_id, payload, occurred_at)
    VALUES ('contrato_assinatura_tokens', token_row.empresa_id, 'CONTRATO_ASSINADO', 'contrato', contract_row.id::text,
      jsonb_build_object('token_id', token_row.id, 'cpf_mask', left(cpf_normalized,3)||'***'||right(cpf_normalized,2)), signed_at);
  END IF;

  RETURN jsonb_build_object('success', true, 'contrato_id', contract_row.id,
    'assinatura_hash', signature_hash, 'assinado_em', signed_at);
END
$function$;

REVOKE ALL ON FUNCTION public.contrato_assinar_por_token(text,text,text,inet,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contrato_assinar_por_token(text,text,text,inet,text) TO anon, authenticated, service_role;
