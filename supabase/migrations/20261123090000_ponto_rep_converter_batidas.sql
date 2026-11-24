-- Etapa 41 do plano de integração do relógio (docs/PLANO_INTEGRACAO_PONTO_HENRY_ATECSOFT.md):
-- converte o dia do staging `ponto_rep_dias` (cópia fiel da tabela CP do
-- AtecSoft) em batidas de verdade em `batidas_ponto`.
--
-- Até aqui o sistema só GUARDAVA o dia: `processado_em` nunca saía de NULL e o
-- espelho do colaborador não via nenhuma batida vinda do relógio. Esta migration
-- fecha esse laço, junto com as etapas 42, 43, 63, 64 e 72, que não existem
-- separadas do ato de converter:
--
--   41 — só insere o que falta; batida é imutável (trigger_imutabilidade_ponto),
--        então a correção vinda do AtecSoft entra como UPDATE da própria batida
--        de origem relógio, nunca como DELETE + INSERT.
--   42 — batida de outra origem (app, quiosque, ajuste do RH, AFDT) na mesma
--        posição do dia NUNCA é tocada: a marcação é pulada e o conflito fica
--        registrado em `erro_processamento` para o RH decidir.
--   43 — dia dentro de competência fechada em `periodos_ponto` não é convertido
--        e gera erro legível, sem alterar nada.
--   63 — entrada/saída vem da POSIÇÃO (`E1`..`E6` = entrada, `S1`..`S6` =
--        saída), nunca da ordem de chegada.
--   64 — virada de dia usa a data da própria batida (`DATA_E*`/`DATA_S*`), então
--        saída depois da meia-noite é gravada no dia seguinte.
--   72 — reprocessamento sob demanda (`ponto_rep_reprocessar_periodo`): rodar
--        duas vezes dá o mesmo resultado.
--
-- Aditiva, idempotente e sem DDL destrutivo. Nenhuma coluna nova em
-- `batidas_ponto`: o rastro fica em `ponto_auditoria` e em `ponto_rep_dias`.
--
-- Quem chama: a Edge Function `ingest-ponto-rep` (service_role), depois de
-- gravar o lote, e o RH pelos botões de reprocessamento. Ninguém mais — o
-- EXECUTE fica só com service_role.

-- 1. Posição do cartão ponto -> (tipo, ordem determinística).
--    `ordem` é fixa por posição, não sequencial de inserção: é o que dá
--    idempotência (a mesma posição do AtecSoft sempre cai na mesma ordem, então
--    o UNIQUE (colaborador_id, data, ordem) reconhece a batida já gravada) e o
--    que mantém entrada/saída alternadas no espelho.
CREATE OR REPLACE FUNCTION public.ponto_rep_posicao_para_batida(_pos text)
RETURNS TABLE (tipo text, ordem integer)
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT m.tipo, m.ordem
  FROM (VALUES
    ('E1', 'entrada', 1), ('S1', 'saida', 2),
    ('E2', 'entrada', 3), ('S2', 'saida', 4),
    ('E3', 'entrada', 5), ('S3', 'saida', 6),
    ('E4', 'entrada', 7), ('S4', 'saida', 8),
    ('E5', 'entrada', 9), ('S5', 'saida', 10),
    ('E6', 'entrada', 11), ('S6', 'saida', 12)
  ) AS m(pos, tipo, ordem)
  WHERE m.pos = upper(_pos);
$$;

REVOKE ALL ON FUNCTION public.ponto_rep_posicao_para_batida(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ponto_rep_posicao_para_batida(text) TO service_role;

-- 2. Conversão de UM dia. Devolve quantas batidas foram inseridas ou
--    atualizadas; marca `processado_em` no sucesso e `erro_processamento` no
--    caso contrário (o dia volta a ser tentado no próximo ciclo porque
--    `processado_em` continua NULL).
-- SECURITY INVOKER de propósito: `proteger_batida_relogio` só aceita gravar
-- origem 'relogio' quando current_user = 'service_role'. Com DEFINER,
-- current_user viraria o dono da função e a conversão seria recusada pelo
-- próprio gatilho. Quem chama é a Edge Function (service_role), que já tem
-- grant e BYPASSRLS nas tabelas.
CREATE OR REPLACE FUNCTION public.ponto_rep_converter_dia(_dia_id uuid)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.ponto_rep_converter_dia(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ponto_rep_converter_dia(uuid) TO service_role;

-- 3. Conversão em lote dos dias pendentes. `_limite` protege contra um primeiro
--    envio histórico (45 dias x N pessoas) travar a transação.
CREATE OR REPLACE FUNCTION public.ponto_rep_processar_dias(_limite integer DEFAULT 200)
RETURNS TABLE (processados integer, batidas integer, com_erro integer)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id        uuid;
  v_batidas   integer;
  v_processados integer := 0;
  v_total     integer := 0;
  v_erros     integer := 0;
BEGIN
  FOR v_id IN
    SELECT d.id FROM public.ponto_rep_dias d
    WHERE d.processado_em IS NULL
    ORDER BY d.data, d.id
    LIMIT GREATEST(COALESCE(_limite, 200), 1)
  LOOP
    v_batidas := public.ponto_rep_converter_dia(v_id);
    v_processados := v_processados + 1;
    v_total := v_total + COALESCE(v_batidas, 0);
    IF v_batidas = 0 AND EXISTS (
      SELECT 1 FROM public.ponto_rep_dias d WHERE d.id = v_id AND d.processado_em IS NULL
    ) THEN
      v_erros := v_erros + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_processados, v_total, v_erros;
END;
$$;

REVOKE ALL ON FUNCTION public.ponto_rep_processar_dias(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ponto_rep_processar_dias(integer) TO service_role;

-- 4. Etapa 72: reprocessamento sob demanda. Devolve os dias ao estado pendente;
--    como a conversão é idempotente, rodar duas vezes dá o mesmo resultado.
CREATE OR REPLACE FUNCTION public.ponto_rep_reprocessar_periodo(_inicio date, _fim date)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total integer;
BEGIN
  IF _inicio IS NULL OR _fim IS NULL OR _inicio > _fim THEN
    RAISE EXCEPTION 'periodo invalido: % a %', _inicio, _fim USING ERRCODE = '22023';
  END IF;

  WITH alvo AS (
    UPDATE public.ponto_rep_dias
       SET processado_em = NULL, erro_processamento = NULL, updated_at = now()
     WHERE data BETWEEN _inicio AND _fim
    RETURNING 1
  )
  SELECT count(*) INTO v_total FROM alvo;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.ponto_rep_reprocessar_periodo(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ponto_rep_reprocessar_periodo(date, date) TO service_role;

-- 5. O reprocessamento é do RH: uma RPC com checagem de empresa, para o botão da
--    tela não depender de service_role no navegador. Fecha o fluxo de ponta a
--    ponta (etapa 118 pede o botão de reenviar visível).
CREATE OR REPLACE FUNCTION public.reprocessar_ponto_relogio(_inicio date, _fim date, _empresa_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessao obrigatoria' USING ERRCODE = '42501';
  END IF;
  IF _empresa_id IS NULL OR NOT (public.has_role(auth.uid(), 'admin') OR public.pode_gerir_rh(_empresa_id)) THEN
    RAISE EXCEPTION 'Sem permissao para reprocessar o ponto desta empresa' USING ERRCODE = '42501';
  END IF;

  WITH alvo AS (
    UPDATE public.ponto_rep_dias
       SET processado_em = NULL, erro_processamento = NULL, updated_at = now()
     WHERE empresa_id = _empresa_id
       AND data BETWEEN _inicio AND _fim
    RETURNING 1
  )
  SELECT count(*) INTO v_total FROM alvo;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.reprocessar_ponto_relogio(date, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reprocessar_ponto_relogio(date, date, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.ponto_rep_converter_dia(uuid) IS
  'Converte um dia do staging do relogio (ponto_rep_dias) em batidas_ponto. Etapa 41 do plano do Ponto AtecSoft.';
COMMENT ON FUNCTION public.ponto_rep_posicao_para_batida(text) IS
  'Posicao do cartao ponto do AtecSoft (E1..S6) -> tipo e ordem da batida no DP.';