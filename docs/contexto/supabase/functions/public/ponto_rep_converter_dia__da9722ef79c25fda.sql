CREATE OR REPLACE FUNCTION public.ponto_rep_converter_dia(_dia_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_dia          public.ponto_rep_dias%ROWTYPE;
  v_colaborador  uuid;
  v_marcacao     jsonb;
  v_tipo         text;
  v_ordem        integer;
  v_hora         time;
  v_data         date;
  v_afetadas     integer := 0;
  v_anterior     record;
  v_fechado      boolean;
  v_conflitos    text[] := ARRAY[]::text[];
  v_hash_digital text;
  v_hash_integ   text;
BEGIN
  SELECT * INTO v_dia FROM public.ponto_rep_dias WHERE id = _dia_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ponto_rep_dias % nao existe', _dia_id USING ERRCODE = '22023';
  END IF;

  SELECT f.colaborador_id INTO v_colaborador
  FROM public.ponto_rep_funcionarios f
  WHERE f.dispositivo_id = v_dia.dispositivo_id
    AND f.codigo = v_dia.funcionario_codigo;

  IF v_colaborador IS NULL THEN
    UPDATE public.ponto_rep_dias
       SET erro_processamento = 'funcionario sem vinculo com colaborador', updated_at = now()
     WHERE id = _dia_id;
    RETURN 0;
  END IF;

  -- Etapa 43: competência fechada não é reprocessada. Mesma lista de status
  -- usada por impedir_alteracao_batida_em_periodo_fechado.
  SELECT EXISTS (
    SELECT 1 FROM public.periodos_ponto pp
    WHERE pp.status IN ('fechado', 'fechada', 'closed', 'homologado')
      AND v_dia.data BETWEEN pp.data_inicio AND pp.data_fim
  ) INTO v_fechado;

  IF v_fechado THEN
    UPDATE public.ponto_rep_dias
       SET erro_processamento = 'periodo fechado: ' || v_dia.data::text, updated_at = now()
     WHERE id = _dia_id;
    RETURN 0;
  END IF;

  FOR v_marcacao IN
    SELECT e.value FROM jsonb_array_elements(v_dia.marcacoes) AS e(value)
  LOOP
    -- Entrada/saída pela posição (etapa 63); posição desconhecida é ignorada.
    SELECT p.tipo, p.ordem INTO v_tipo, v_ordem
    FROM public.ponto_rep_posicao_para_batida(v_marcacao ->> 'pos') AS p;

    CONTINUE WHEN v_ordem IS NULL;

    -- Marcação sem hora (só justificativa) não é batida: é ocorrência do dia,
    -- tratada na etapa 68, não aqui.
    v_hora := NULLIF(v_marcacao ->> 'hora', '')::time;
    CONTINUE WHEN v_hora IS NULL;

    -- Etapa 64: a data da própria batida manda. O AtecSoft grava `DATA_S*` no
    -- dia seguinte quando o turno vira a meia-noite; sem esse campo, vale o dia
    -- do cartão ponto.
    v_data := COALESCE(NULLIF(v_marcacao ->> 'data', '')::date, v_dia.data);

    SELECT b.id, b.hora, b.tipo, b.origem INTO v_anterior
    FROM public.batidas_ponto b
    WHERE b.colaborador_id = v_colaborador
      AND b.data = v_data
      AND b.ordem = v_ordem;

    IF FOUND THEN
      -- Etapa 42: batida de outra origem sobrevive ao reprocessamento.
      IF v_anterior.origem IS DISTINCT FROM 'relogio' THEN
        v_conflitos := v_conflitos || (v_marcacao ->> 'pos');
        CONTINUE;
      END IF;

      -- Mesma batida: nada a fazer (idempotência).
      CONTINUE WHEN v_anterior.hora = v_hora AND v_anterior.tipo = v_tipo;

      -- Etapa 41: correção vinda do AtecSoft reflete na batida do relógio por
      -- UPDATE. Os dois hashes são recalculados aqui porque os gatilhos que os
      -- geram são BEFORE INSERT (gerar_hash_batida_ponto) e só preenchem o
      -- hash de integridade quando o campo vem vazio.
      v_hash_digital := encode(digest(
        COALESCE(v_colaborador::text, '') || COALESCE(v_data::text, '') ||
        COALESCE(v_hora::text, '') || COALESCE(v_tipo, '') ||
        COALESCE(v_dia.dispositivo_id::text, '') || '',
        'sha256'), 'hex');
      v_hash_integ := encode(digest(
        COALESCE(v_colaborador::text, '') || '|' || COALESCE(v_data::text, '') || '|' ||
        COALESCE(v_hora::text, '') || '|' || COALESCE(v_tipo, '') || '|' ||
        COALESCE(v_dia.dispositivo_id::text, ''),
        'sha256'), 'hex');

      UPDATE public.batidas_ponto
         SET hora = v_hora,
             tipo = v_tipo,
             hash_digital = v_hash_digital,
             hash_integridade = v_hash_integ,
             updated_at = now()
       WHERE id = v_anterior.id;

      INSERT INTO public.ponto_auditoria (
        tabela_nome, registro_id, acao, dados_anteriores, dados_novos, justificativa
      ) VALUES (
        'batidas_ponto', v_anterior.id, 'UPDATE',
        jsonb_build_object('hora', v_anterior.hora, 'tipo', v_anterior.tipo),
        jsonb_build_object('hora', v_hora, 'tipo', v_tipo),
        'correcao vinda do Ponto AtecSoft (etapa 41)'
      );

      v_afetadas := v_afetadas + 1;
      CONTINUE;
    END IF;

    -- ON CONFLICT cobre a corrida de duas execuções simultâneas do mesmo dia:
    -- quem chega depois não duplica.
    INSERT INTO public.batidas_ponto (
      colaborador_id, empresa_id, data, hora, ordem, tipo, origem,
      dispositivo_id, is_offline, ajustado
    ) VALUES (
      v_colaborador, v_dia.empresa_id, v_data, v_hora, v_ordem, v_tipo, 'relogio',
      v_dia.dispositivo_id::text, false, false
    )
    ON CONFLICT (colaborador_id, data, ordem) DO NOTHING;

    IF FOUND THEN
      v_afetadas := v_afetadas + 1;
    END IF;
  END LOOP;

  UPDATE public.ponto_rep_dias
     SET processado_em = now(),
         erro_processamento = CASE
           WHEN coalesce(array_length(v_conflitos, 1), 0) > 0
             THEN 'conflito com batida de outra origem nas posicoes: ' || array_to_string(v_conflitos, ',')
           ELSE NULL
         END,
         updated_at = now()
   WHERE id = _dia_id;

  RETURN v_afetadas;
END;
$function$
