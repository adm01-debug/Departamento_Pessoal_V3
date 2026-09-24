-- P0: remediação das 28 funções SECURITY DEFINER expostas sem autorização
-- interna comprovada, achado do gate scripts/audit-secdef-authz.mjs.
--
-- Corpos lidos direto de produção (canonical-probes.yml) nesta sessão, não
-- das migrations locais -- já provado nesta sessão que o repo diverge do
-- banco vivo. Cada uma das 28 recebeu julgamento individual, em 3 grupos:
--
-- (1) REVOKE EXECUTE — rotina interna/cron, nunca deveria ser alcançável
--     pela API. Inclui `mcp_query_sql`, que decodifica base64 e executa SQL
--     arbitrário como o dono da função -- crítico, revogado com urgência.
-- (2) Authz real adicionada no corpo — deriva o tenant/titular do próprio
--     dado (não confia no id recebido do cliente) e valida com
--     pertence_a_empresa/pode_gerir_rh/pode_gerir_pessoas/sou_o_colaborador.
--     Inclui os 3 incidentes citados no próprio docstring do gate
--     (registrar_batida_ponto, gerar_canonical_espelho_ponto,
--     sst_regimento_assinar) mais clinicas_proximas.
-- (3) ALLOWLIST em scripts/audit-secdef-authz.mjs — infraestrutura
--     legitimamente alcançável antes de existir sessão (checagem de
--     login/rate-limit/geo-bloqueio, PIN de quiosque) ou primitivo usado
--     internamente por políticas RLS (mesma categoria de has_role/is_admin
--     já presentes na allowlist).

-- ── Grupo 1: REVOKE — rotina interna/cron, sem motivo para estar na API ──

-- CRÍTICO: decodifica base64 e executa SQL arbitrário (inclusive não-SELECT,
-- via branch `EXECUTE decoded_sql`) como o dono da função. Não pode ficar
-- alcançável por anon/authenticated em hipótese alguma.
REVOKE EXECUTE ON FUNCTION public.mcp_query_sql(text, integer, boolean) FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.anonimizar_dados_pessoais(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_ciencia_rate_limits() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reconciliar_ferias_folha_batch() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sec_verify_seals() FROM anon, authenticated;

-- Funções de trigger: disparo do trigger não passa pela checagem de EXECUTE
-- (o executor invoca o C function pointer diretamente), então revogar aqui
-- não quebra os triggers já criados -- só fecha a chamada direta via RPC.
REVOKE EXECUTE ON FUNCTION public.calcular_prazo_cat() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validar_contrato_clt() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_ponto_compliance() FROM anon, authenticated;

-- ── Grupo 2: authz real no corpo (deriva do dado, não confia no id recebido) ──

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
 RETURNS app_role[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select array_agg(role)
  from public.user_roles
  where user_id = _user_id
    and (_user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
$function$;

CREATE OR REPLACE FUNCTION public.processar_ajuste_aprovado(p_solicitacao_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_solicitacao RECORD;
BEGIN
    SELECT * INTO v_solicitacao FROM public.solicitacoes_ajuste_ponto WHERE id = p_solicitacao_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Solicitação não encontrada';
    END IF;

    IF NOT public.pode_gerir_rh(v_solicitacao.empresa_id) THEN
        RAISE EXCEPTION 'Sem permissão para processar este ajuste';
    END IF;

    IF v_solicitacao.status != 'aprovado' THEN
        RAISE EXCEPTION 'Apenas solicitações aprovadas podem ser processadas';
    END IF;

    INSERT INTO public.batidas_ponto (
        colaborador_id,
        empresa_id,
        data,
        hora,
        tipo,
        origem,
        ajustada,
        motivo_ajuste,
        hash_integridade
    ) VALUES (
        v_solicitacao.colaborador_id,
        v_solicitacao.empresa_id,
        v_solicitacao.data_ponto,
        v_solicitacao.hora_sugerida,
        v_solicitacao.tipo_ponto,
        'ajuste_manual',
        true,
        v_solicitacao.motivo,
        encode(digest(v_solicitacao.id::text || now()::text, 'sha256'), 'hex')
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.clinicas_proximas(p_empresa_id uuid, p_lat numeric, p_lng numeric, p_tipo_exame text DEFAULT NULL::text, p_raio_km numeric DEFAULT 50, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, razao_social text, nome_fantasia text, cidade text, uf text, telefone text, sla_medio_min integer, tipos_exame text[], distancia_km numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    cp.id, cp.razao_social, cp.nome_fantasia, cp.cidade, cp.uf, cp.telefone,
    cp.sla_medio_min, cp.tipos_exame,
    public.distancia_haversine(p_lat, p_lng, cp.geo_lat, cp.geo_lng) AS distancia_km
  FROM public.clinicas_partners cp
  WHERE cp.empresa_id = p_empresa_id
    AND public.pertence_a_empresa(p_empresa_id)
    AND cp.status = 'ativo'
    AND cp.geo_lat IS NOT NULL AND cp.geo_lng IS NOT NULL
    AND (p_tipo_exame IS NULL OR p_tipo_exame = ANY(cp.tipos_exame))
    AND public.distancia_haversine(p_lat, p_lng, cp.geo_lat, cp.geo_lng) <= p_raio_km
  ORDER BY distancia_km ASC NULLS LAST
  LIMIT p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.consumir_pendencias_medida_no_holerite(p_holerite_id uuid, p_colaborador_id uuid, p_competencia text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pend RECORD;
  v_count INTEGER := 0;
  v_empresa_id uuid;
BEGIN
  SELECT empresa_id INTO v_empresa_id FROM public.colaboradores WHERE id = p_colaborador_id;
  IF v_empresa_id IS NULL OR NOT public.pode_gerir_rh(v_empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para esta operação';
  END IF;

  FOR v_pend IN
    SELECT * FROM public.medidas_disciplinares_integracao
    WHERE colaborador_id = p_colaborador_id
      AND tipo_integracao = 'lancamento_folha_pendente'
      AND status = 'pendente'
      AND (competencia IS NULL OR competencia <= p_competencia)
    FOR UPDATE
  LOOP
    INSERT INTO public.lancamentos_folha (
      holerite_id, rubrica_id, rubrica_codigo, rubrica_descricao,
      tipo, referencia, valor, automatico
    ) VALUES (
      p_holerite_id,
      (v_pend.detalhes->>'rubrica_id')::uuid,
      COALESCE(v_pend.detalhes->>'rubrica_codigo','DESC_SUSP'),
      'Desconto por Suspensão Disciplinar',
      'desconto'::tipo_evento_folha,
      v_pend.dias,
      v_pend.valor,
      true
    );

    UPDATE public.medidas_disciplinares_integracao
    SET status = 'aplicado',
        tipo_integracao = 'lancamento_folha_aplicado',
        detalhes = detalhes || jsonb_build_object('holerite_id', p_holerite_id, 'aplicado_em', now())
    WHERE id = v_pend.id;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_link_gov_br_account(_user_id uuid, _cpf text, _nivel text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF _user_id <> auth.uid() THEN
        RAISE EXCEPTION 'Não autorizado';
    END IF;

    UPDATE public.profiles
    SET gov_br_vinculado = true,
        gov_br_nivel = _nivel
    WHERE id = _user_id;

    UPDATE public.colaboradores
    SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{gov_br_verified}', 'true')
    WHERE cpf = _cpf AND empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = _user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.garantir_rubrica_suspensao(p_empresa_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rubrica_id UUID;
BEGIN
  IF NOT public.pode_gerir_rh(p_empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para esta operação';
  END IF;

  SELECT id INTO v_rubrica_id
  FROM public.rubricas_folha
  WHERE empresa_id = p_empresa_id AND codigo = 'DESC_SUSP'
  LIMIT 1;

  IF v_rubrica_id IS NULL THEN
    INSERT INTO public.rubricas_folha (
      empresa_id, codigo, descricao, tipo,
      incide_inss, incide_irrf, incide_fgts, automatico, ativo, natureza_rubrica
    ) VALUES (
      p_empresa_id, 'DESC_SUSP', 'Desconto por Suspensão Disciplinar', 'desconto',
      false, false, false, true, true, 'desconto_disciplinar'
    )
    RETURNING id INTO v_rubrica_id;
  END IF;

  RETURN v_rubrica_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.gerar_canonical_espelho_ponto(_colaborador_id uuid, _competencia text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inicio date;
  v_fim date;
  v_colab record;
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

  IF NOT (public.sou_o_colaborador(_colaborador_id) OR public.pode_gerir_rh(v_colab.empresa_id)) THEN
    RAISE EXCEPTION 'Sem permissão para este espelho de ponto';
  END IF;

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

CREATE OR REPLACE FUNCTION public.gerar_rubricas_ferias(p_ferias_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ferias record;
  v_competencia date;
  v_inseridos integer := 0;
  v_rid uuid;
  v_rubricas jsonb := jsonb_build_array(
    jsonb_build_object('codigo','1050','descricao','Férias','tipo','provento','campo','valor_ferias'),
    jsonb_build_object('codigo','1051','descricao','1/3 Constitucional Férias','tipo','provento','campo','valor_terco'),
    jsonb_build_object('codigo','1052','descricao','Abono Pecuniário','tipo','provento','campo','valor_abono'),
    jsonb_build_object('codigo','1053','descricao','1/3 sobre Abono','tipo','provento','campo','valor_terco_abono'),
    jsonb_build_object('codigo','1054','descricao','INSS Férias','tipo','desconto','campo','descontos_inss'),
    jsonb_build_object('codigo','1055','descricao','IRRF Férias','tipo','desconto','campo','descontos_irrf'),
    jsonb_build_object('codigo','1056','descricao','Adiantamento 13º nas Férias (Lei 4.749/65)','tipo','provento','campo','valor_adiantamento_13')
  );
  v_rubrica jsonb;
  v_valor numeric;
BEGIN
  SELECT * INTO v_ferias FROM public.ferias WHERE id = p_ferias_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF NOT public.pode_gerir_rh(v_ferias.empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para esta operação';
  END IF;

  v_competencia := date_trunc('month', v_ferias.data_inicio)::date;

  FOR v_rubrica IN SELECT * FROM jsonb_array_elements(v_rubricas) LOOP
    EXECUTE format('SELECT ($1).%I', v_rubrica->>'campo') INTO v_valor USING v_ferias;
    IF COALESCE(v_valor, 0) <= 0 THEN CONTINUE; END IF;

    SELECT id INTO v_rid FROM public.rubricas_folha
      WHERE codigo = v_rubrica->>'codigo'
        AND (empresa_id = v_ferias.empresa_id OR empresa_id IS NULL)
      ORDER BY empresa_id NULLS LAST LIMIT 1;

    INSERT INTO public.eventos_variaveis (
      competencia, colaborador_id, rubrica_id, referencia, valor, observacao,
      origem_ferias_id, empresa_id
    ) VALUES (
      v_competencia, v_ferias.colaborador_id, v_rid,
      COALESCE(v_ferias.dias_gozo,0)::text || ' dias',
      v_valor,
      format('Gerado automaticamente das férias %s (%s)', p_ferias_id, v_rubrica->>'descricao'),
      p_ferias_id, v_ferias.empresa_id
    )
    ON CONFLICT (origem_ferias_id, rubrica_id) DO UPDATE
      SET valor = EXCLUDED.valor,
          referencia = EXCLUDED.referencia,
          observacao = EXCLUDED.observacao;
    v_inseridos := v_inseridos + 1;
  END LOOP;

  RETURN v_inseridos;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_colaborador_banco_horas(p_colaborador_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_saldo_total INTEGER := 0;
    v_empresa_id uuid;
BEGIN
    SELECT empresa_id INTO v_empresa_id FROM public.colaboradores WHERE id = p_colaborador_id;
    IF NOT (public.sou_o_colaborador(p_colaborador_id)
            OR public.pode_gerir_rh(v_empresa_id)
            OR public.pode_gerir_pessoas(v_empresa_id)) THEN
        RAISE EXCEPTION 'Sem permissão para este saldo de banco de horas';
    END IF;

    SELECT
        COALESCE(SUM(
            EXTRACT(EPOCH FROM (COALESCE(horas_extras, '00:00:00'::interval) - COALESCE(horas_falta, '00:00:00'::interval))) / 60
        )::INTEGER, 0)
    INTO v_saldo_total
    FROM public.registros_ponto
    WHERE colaborador_id = p_colaborador_id
    AND aprovado = true;

    RETURN v_saldo_total;
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_batida_ponto(p_colaborador_id uuid, p_empresa_id uuid, p_data date, p_hora time without time zone, p_tipo text, p_origem text DEFAULT 'web'::text, p_latitude numeric DEFAULT NULL::numeric, p_longitude numeric DEFAULT NULL::numeric, p_precisao_metros integer DEFAULT NULL::integer, p_dispositivo_id text DEFAULT 'web-browser'::text, p_dentro_raio boolean DEFAULT true, p_timezone text DEFAULT 'America/Sao_Paulo'::text, p_hash_integridade text DEFAULT NULL::text, p_foto_biometria_url text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS batidas_ponto
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ordem integer;
  v_batida public.batidas_ponto;
  v_real_empresa_id uuid;
BEGIN
  SELECT empresa_id INTO v_real_empresa_id FROM public.colaboradores WHERE id = p_colaborador_id;
  IF v_real_empresa_id IS NULL OR v_real_empresa_id <> p_empresa_id THEN
    RAISE EXCEPTION 'Empresa informada não corresponde ao colaborador';
  END IF;

  IF NOT (public.sou_o_colaborador(p_colaborador_id)
          OR public.pode_gerir_rh(p_empresa_id)
          OR public.pode_gerir_pessoas(p_empresa_id)) THEN
    RAISE EXCEPTION 'Sem permissão para registrar ponto deste colaborador';
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
    dentro_raio, timezone, hash_integridade, audit_sha256,
    audit_conformidade, foto_biometria_url, metadata
  ) VALUES (
    p_colaborador_id, p_empresa_id, p_data, p_hora, v_ordem, p_tipo, p_origem,
    p_latitude, p_longitude, p_precisao_metros, p_dispositivo_id,
    p_dentro_raio, p_timezone, p_hash_integridade, p_hash_integridade,
    true, p_foto_biometria_url, p_metadata
  )
  RETURNING * INTO v_batida;

  RETURN v_batida;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sst_regimento_assinar(p_documento_id uuid, p_colaborador_id uuid, p_ip text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  v_doc RECORD;
  v_hash_ass TEXT;
BEGIN
  IF NOT public.sou_o_colaborador(p_colaborador_id) THEN
    RAISE EXCEPTION 'Sem permissão para assinar em nome deste colaborador';
  END IF;

  SELECT * INTO v_doc FROM public.sst_regimento_documentos WHERE id = p_documento_id;
  IF NOT FOUND OR v_doc.status <> 'PUBLICADO' THEN
    RAISE EXCEPTION 'Documento não publicado';
  END IF;

  v_hash_ass := encode(digest(
    v_doc.hash_sha256 || '|' || p_colaborador_id::text || '|' || now()::text,
    'sha256'
  ), 'hex');

  INSERT INTO public.sst_regimento_assinaturas
    (documento_id, colaborador_id, empresa_id, hash_documento, hash_assinatura, ip_origem, user_agent)
  VALUES
    (p_documento_id, p_colaborador_id, v_doc.empresa_id, v_doc.hash_sha256, v_hash_ass, p_ip, p_user_agent)
  ON CONFLICT (documento_id, colaborador_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'hash_assinatura', v_hash_ass);
END;
$function$;
