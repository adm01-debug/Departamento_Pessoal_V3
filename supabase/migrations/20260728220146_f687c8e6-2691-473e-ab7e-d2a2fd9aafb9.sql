-- ============================================================
-- Hardening: funções SECURITY DEFINER do módulo de PONTO
-- que aceitavam identificadores do chamador sem verificar tenant.
-- ============================================================

-- 1) registrar_batida_ponto
--    ANTES: p_empresa_id vinha do cliente e era gravado como veio;
--           qualquer usuário autenticado podia forjar batida para
--           qualquer colaborador de qualquer empresa.
--    AGORA: empresa derivada do cadastro do colaborador (fonte de
--           verdade) + exigência de vínculo do chamador com ela.
CREATE OR REPLACE FUNCTION public.registrar_batida_ponto(
  p_colaborador_id uuid,
  p_empresa_id uuid,
  p_data date,
  p_hora time without time zone,
  p_tipo text,
  p_origem text DEFAULT 'web'::text,
  p_latitude numeric DEFAULT NULL::numeric,
  p_longitude numeric DEFAULT NULL::numeric,
  p_precisao_metros integer DEFAULT NULL::integer,
  p_dispositivo_id text DEFAULT 'web-browser'::text,
  p_dentro_raio boolean DEFAULT true,
  p_timezone text DEFAULT 'America/Sao_Paulo'::text,
  p_hash_integridade text DEFAULT NULL::text,
  p_foto_biometria_url text DEFAULT NULL::text,
  p_metadata jsonb DEFAULT NULL::jsonb
)
RETURNS public.batidas_ponto
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_ordem       integer;
  v_batida      public.batidas_ponto;
  v_empresa_id  uuid;
  v_status      text;
BEGIN
  -- Fonte de verdade do tenant: o cadastro do colaborador.
  -- O p_empresa_id recebido é deliberadamente IGNORADO para o INSERT.
  SELECT c.empresa_id, c.status::text
    INTO v_empresa_id, v_status
    FROM public.colaboradores c
   WHERE c.id = p_colaborador_id;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Autorização: exigida para chamadas com JWT (cliente).
  -- auth.uid() nulo = contexto service_role (edge functions), que já
  -- opera com privilégio próprio e é auditado na origem.
  IF auth.uid() IS NOT NULL
     AND NOT public.pertence_a_empresa(v_empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para registrar ponto deste colaborador'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Coerência do parâmetro: se o chamador informou empresa, ela precisa
  -- bater com a real. Divergência indica tentativa de forja.
  IF p_empresa_id IS NOT NULL AND p_empresa_id <> v_empresa_id THEN
    RAISE EXCEPTION 'Empresa informada não corresponde ao colaborador'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_status = 'desligado' THEN
    RAISE EXCEPTION 'Colaborador desligado não pode registrar ponto'
      USING ERRCODE = 'check_violation';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(p_colaborador_id::text || p_data::text)
  );

  SELECT COALESCE(MAX(ordem), 0) + 1
    INTO v_ordem
    FROM public.batidas_ponto
   WHERE colaborador_id = p_colaborador_id
     AND data = p_data;

  INSERT INTO public.batidas_ponto (
    colaborador_id, empresa_id, data, hora, ordem, tipo, origem,
    latitude, longitude, precisao_metros, dispositivo_id,
    dentro_raio, timezone, foto_biometria_url, device_metadata
    -- hash_integridade: omitido de propósito; o gatilho
    -- enforce_batida_ponto_hash sela a linha a partir do conteúdo gravado.
  ) VALUES (
    p_colaborador_id, v_empresa_id, p_data, p_hora, v_ordem, p_tipo, p_origem,
    p_latitude, p_longitude, p_precisao_metros, p_dispositivo_id,
    p_dentro_raio, p_timezone, p_foto_biometria_url,
    COALESCE(p_metadata, '{}'::jsonb)
      || jsonb_build_object('device_hash', p_hash_integridade)
  )
  RETURNING * INTO v_batida;

  RETURN v_batida;
END;
$function$;

-- 2) gerar_canonical_espelho_ponto
--    ANTES: devolvia nome, CPF, PIS e matrícula de QUALQUER colaborador
--           para qualquer usuário autenticado (vazamento de PII).
--    AGORA: escopo de empresa obrigatório.
CREATE OR REPLACE FUNCTION public.gerar_canonical_espelho_ponto(
  _colaborador_id uuid,
  _competencia text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_inicio  date;
  v_fim     date;
  v_colab   record;
  v_batidas jsonb;
BEGIN
  v_inicio := to_date(_competencia || '-01', 'YYYY-MM-DD');
  v_fim := (v_inicio + interval '1 month' - interval '1 day')::date;

  SELECT c.id, c.nome_completo, c.cpf, c.pis_pasep, c.empresa_id, c.matricula
    INTO v_colab
    FROM public.colaboradores c
   WHERE c.id = _colaborador_id;

  IF v_colab.id IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;

  -- Escopo de tenant antes de devolver PII (CPF/PIS).
  IF auth.uid() IS NOT NULL
     AND NOT public.pertence_a_empresa(v_colab.empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para acessar o espelho deste colaborador'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Ordenação determinística: por timestamp ASC, depois id ASC
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'data_hora', to_char(b.data_hora AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD"T"HH24:MI:SS'),
      'tipo', b.tipo,
      'origem', b.origem,
      'nsr', b.nsr
    ) ORDER BY b.data_hora ASC, b.id ASC
  ), '[]'::jsonb)
  INTO v_batidas
  FROM public.batidas_ponto b
  WHERE b.colaborador_id = _colaborador_id
    AND (b.data_hora AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN v_inicio AND v_fim;

  RETURN jsonb_build_object(
    'versao', '1.0',
    'colaborador', jsonb_build_object(
      'id', v_colab.id,
      'nome', v_colab.nome_completo,
      'cpf', v_colab.cpf,
      'pis', v_colab.pis_pasep,
      'matricula', v_colab.matricula
    ),
    'empresa_id', v_colab.empresa_id,
    'competencia', _competencia,
    'periodo', jsonb_build_object('inicio', v_inicio, 'fim', v_fim),
    'batidas', v_batidas,
    'total_batidas', jsonb_array_length(v_batidas)
  );
END;
$function$;

-- anon nunca deve alcançar estas rotinas
REVOKE EXECUTE ON FUNCTION public.registrar_batida_ponto(
  uuid, uuid, date, time without time zone, text, text, numeric, numeric,
  integer, text, boolean, text, text, text, jsonb
) FROM anon;
REVOKE EXECUTE ON FUNCTION public.gerar_canonical_espelho_ponto(uuid, text) FROM anon;