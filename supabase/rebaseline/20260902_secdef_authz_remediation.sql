-- 2026-09-02: fecha as 11 funções SECURITY DEFINER sem autorização interna
-- encontradas pelo gate scripts/audit-secdef-authz.mjs (o gate em si estava
-- desconectado do CI por um bug de conexão, corrigido separadamente).
--
-- Depende de supabase/rebaseline/20260831_security_remediation.sql já
-- aplicado (usa pode_gerir_rh, pertence_a_empresa, sou_o_colaborador,
-- user_belongs_to_empresa, is_admin).
--
-- Duas das onze são os incidentes reais documentados no cabeçalho do gate:
-- registrar_batida_ponto (fraude de jornada) e gerar_canonical_espelho_ponto
-- (vazamento de CPF/PIS/matrícula de qualquer colaborador do sistema).

-- ---------------------------------------------------------------------------
-- Grupo 1 — sem uso legítimo como RPC (trigger interno ou job de cron):
-- REVOKE de anon/authenticated. O disparo por trigger não depende de EXECUTE
-- concedido ao role da sessão que fez o DML original.
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.cleanup_ciencia_rate_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_ciencia_rate_limits() TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_failed_login() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_failed_login() TO service_role;

REVOKE EXECUTE ON FUNCTION public.validar_contrato_clt() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validar_contrato_clt() TO service_role;

-- check_login_lock / record_failed_login(text,text): o gate as sinalizou de
-- novo porque são RPCs pré-login (sem auth.uid() disponível), mas
-- src/tests/rpc-permissions.test.ts e src/hooks/__tests__/useBruteForceProtection.test.ts
-- já documentam e testam que foram INTENCIONALMENTE revogadas — permitiam
-- travar a conta de qualquer pessoa (DoS de lockout) só sabendo o e-mail,
-- sem tentar nenhuma senha. O lockout real é feito pela edge function
-- auth-login com service_role; o hook do frontend já foi corrigido para não
-- chamar essas RPCs. Aqui fechamos o lado que ainda faltava: o banco.
REVOKE EXECUTE ON FUNCTION public.check_login_lock(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_login_lock(text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_failed_login(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_failed_login(text, text) TO service_role;

-- ---------------------------------------------------------------------------
-- Grupo 2 — RPCs legítimas: autorização adicionada no próprio corpo.
-- ---------------------------------------------------------------------------

-- garantir_rubrica_suspensao: qualquer autenticado podia criar rubrica de
-- folha (categoria de desconto) em QUALQUER empresa passando o empresa_id.
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
    RAISE EXCEPTION 'Sem permissão para gerir rubricas desta empresa';
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

-- get_user_roles: qualquer autenticado podia consultar os papéis de
-- QUALQUER outro usuário passando o user_id — enumeração de admins/RH.
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS app_role[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select case
    when _user_id = auth.uid() or public.is_admin(auth.uid())
      then (select array_agg(role) from public.user_roles where user_id = _user_id)
    else null
  end
$function$;

-- clinicas_proximas: qualquer autenticado podia listar a rede de clínicas
-- parceiras (razão social, telefone) de QUALQUER empresa informando o id.
CREATE OR REPLACE FUNCTION public.clinicas_proximas(
  p_empresa_id uuid, p_lat numeric, p_lng numeric,
  p_tipo_exame text DEFAULT NULL::text, p_raio_km numeric DEFAULT 50, p_limit integer DEFAULT 20
)
RETURNS TABLE(id uuid, razao_social text, nome_fantasia text, cidade text, uf text, telefone text,
              sla_medio_min integer, tipos_exame text[], distancia_km numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    cp.id, cp.razao_social, cp.nome_fantasia, cp.cidade, cp.uf, cp.telefone,
    cp.sla_medio_min, cp.tipos_exame,
    public.distancia_haversine(p_lat, p_lng, cp.geo_lat, cp.geo_lng) AS distancia_km
  FROM public.clinicas_partners cp
  WHERE public.pertence_a_empresa(p_empresa_id)
    AND cp.empresa_id = p_empresa_id
    AND cp.status = 'ativo'
    AND cp.geo_lat IS NOT NULL AND cp.geo_lng IS NOT NULL
    AND (p_tipo_exame IS NULL OR p_tipo_exame = ANY(cp.tipos_exame))
    AND public.distancia_haversine(p_lat, p_lng, cp.geo_lat, cp.geo_lng) <= p_raio_km
  ORDER BY distancia_km ASC NULLS LAST
  LIMIT p_limit;
$function$;

-- consumir_pendencias_medida_no_holerite: lançava desconto disciplinar em
-- QUALQUER holerite/colaborador informado, sem checar RH nem empresa. A
-- empresa é derivada do próprio colaborador — nunca de parâmetro do chamador.
CREATE OR REPLACE FUNCTION public.consumir_pendencias_medida_no_holerite(
  p_holerite_id uuid, p_colaborador_id uuid, p_competencia text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa_id uuid;
  v_pend RECORD;
  v_count INTEGER := 0;
BEGIN
  SELECT empresa_id INTO v_empresa_id FROM public.colaboradores WHERE id = p_colaborador_id;
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;
  IF NOT public.pode_gerir_rh(v_empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão para lançar pendências disciplinares nesta empresa';
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

-- gerar_canonical_espelho_ponto: INCIDENTE REAL. Devolvia nome, CPF, PIS e
-- matrícula de QUALQUER colaborador do sistema, sem checar RH nem titular.
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

  IF NOT (public.pode_gerir_rh(v_colab.empresa_id) OR public.sou_o_colaborador(_colaborador_id)) THEN
    RAISE EXCEPTION 'Sem permissão para consultar o espelho de ponto deste colaborador';
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

-- sst_regimento_assinar: registrava aceite formal do regimento interno em
-- nome de QUALQUER colaborador informado, inclusive de outra empresa.
CREATE OR REPLACE FUNCTION public.sst_regimento_assinar(
  p_documento_id uuid, p_colaborador_id uuid, p_ip text DEFAULT NULL::text, p_user_agent text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $function$
DECLARE
  v_doc RECORD;
  v_hash_ass TEXT;
BEGIN
  SELECT * INTO v_doc FROM public.sst_regimento_documentos WHERE id = p_documento_id;
  IF NOT FOUND OR v_doc.status <> 'PUBLICADO' THEN
    RAISE EXCEPTION 'Documento não publicado';
  END IF;

  IF NOT (public.sou_o_colaborador(p_colaborador_id) OR public.pode_gerir_rh(v_doc.empresa_id)) THEN
    RAISE EXCEPTION 'Sem permissão para assinar em nome deste colaborador';
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

-- registrar_batida_ponto: INCIDENTE REAL. Aceitava colaborador_id E
-- empresa_id do chamador sem checagem — qualquer autenticado forjava
-- jornada para qualquer colaborador de qualquer empresa (Portaria 671).
-- empresa_id agora é sempre derivado do colaborador, nunca do parâmetro.
CREATE OR REPLACE FUNCTION public.registrar_batida_ponto(
  p_colaborador_id uuid, p_empresa_id uuid, p_data date, p_hora time without time zone,
  p_tipo text, p_origem text DEFAULT 'web'::text,
  p_latitude numeric DEFAULT NULL::numeric, p_longitude numeric DEFAULT NULL::numeric,
  p_precisao_metros integer DEFAULT NULL::integer, p_dispositivo_id text DEFAULT 'web-browser'::text,
  p_dentro_raio boolean DEFAULT true, p_timezone text DEFAULT 'America/Sao_Paulo'::text,
  p_hash_integridade text DEFAULT NULL::text, p_foto_biometria_url text DEFAULT NULL::text,
  p_metadata jsonb DEFAULT NULL::jsonb
)
RETURNS batidas_ponto
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa_real uuid;
  v_ordem integer;
  v_batida public.batidas_ponto;
BEGIN
  SELECT empresa_id INTO v_empresa_real FROM public.colaboradores WHERE id = p_colaborador_id;
  IF v_empresa_real IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado';
  END IF;

  IF NOT (public.sou_o_colaborador(p_colaborador_id) OR public.pode_gerir_rh(v_empresa_real)) THEN
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
    p_colaborador_id, v_empresa_real, p_data, p_hora, v_ordem, p_tipo, p_origem,
    p_latitude, p_longitude, p_precisao_metros, p_dispositivo_id,
    p_dentro_raio, p_timezone, p_hash_integridade, p_hash_integridade,
    true, p_foto_biometria_url, p_metadata
  )
  RETURNING * INTO v_batida;

  RETURN v_batida;
END;
$function$;
