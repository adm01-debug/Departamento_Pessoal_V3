CREATE OR REPLACE FUNCTION public.fn_consolidar_batidas()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_batidas INTEGER;
  v_entrada_1 TEXT; v_saida_1 TEXT;
  v_entrada_2 TEXT; v_saida_2 TEXT;
  v_entrada_3 TEXT; v_saida_3 TEXT;
  v_entrada_4 TEXT; v_saida_4 TEXT;
  v_entrada_5 TEXT; v_saida_5 TEXT;
  v_entrada_6 TEXT; v_saida_6 TEXT;
  v_total_minutos INTEGER := 0;
  v_jornada RECORD;
  v_jornada_minutos INTEGER;
  v_atraso_minutos INTEGER := 0;
  v_extras_minutos INTEGER := 0;
  v_falta_minutos INTEGER := 0;
  v_saida_antecipada INTEGER := 0;
  v_horas_trab INTERVAL;
  v_horas_ext INTERVAL;
  v_horas_fal INTERVAL;
BEGIN
  SELECT COUNT(*) INTO v_total_batidas
  FROM public.batidas_ponto
  WHERE colaborador_id = NEW.colaborador_id AND data = NEW.data;

  SELECT
    MAX(CASE WHEN ordem = 1 AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 2 AND tipo = 'saida' THEN hora::text END),
    MAX(CASE WHEN ordem = 3 AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 4 AND tipo = 'saida' THEN hora::text END),
    MAX(CASE WHEN ordem = 5 AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 6 AND tipo = 'saida' THEN hora::text END),
    MAX(CASE WHEN ordem = 7 AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 8 AND tipo = 'saida' THEN hora::text END),
    MAX(CASE WHEN ordem = 9 AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 10 AND tipo = 'saida' THEN hora::text END),
    MAX(CASE WHEN ordem = 11 AND tipo = 'entrada' THEN hora::text END),
    MAX(CASE WHEN ordem = 12 AND tipo = 'saida' THEN hora::text END)
  INTO v_entrada_1, v_saida_1, v_entrada_2, v_saida_2, v_entrada_3, v_saida_3,
       v_entrada_4, v_saida_4, v_entrada_5, v_saida_5, v_entrada_6, v_saida_6
  FROM public.batidas_ponto
  WHERE colaborador_id = NEW.colaborador_id AND data = NEW.data;

  -- Calcular minutos trabalhados para cada par
  IF v_entrada_1 IS NOT NULL AND v_saida_1 IS NOT NULL THEN
    v_total_minutos := v_total_minutos + EXTRACT(EPOCH FROM (v_saida_1::time - v_entrada_1::time))::INTEGER / 60;
  END IF;
  IF v_entrada_2 IS NOT NULL AND v_saida_2 IS NOT NULL THEN
    v_total_minutos := v_total_minutos + EXTRACT(EPOCH FROM (v_saida_2::time - v_entrada_2::time))::INTEGER / 60;
  END IF;
  IF v_entrada_3 IS NOT NULL AND v_saida_3 IS NOT NULL THEN
    v_total_minutos := v_total_minutos + EXTRACT(EPOCH FROM (v_saida_3::time - v_entrada_3::time))::INTEGER / 60;
  END IF;
  IF v_entrada_4 IS NOT NULL AND v_saida_4 IS NOT NULL THEN
    v_total_minutos := v_total_minutos + EXTRACT(EPOCH FROM (v_saida_4::time - v_entrada_4::time))::INTEGER / 60;
  END IF;
  IF v_entrada_5 IS NOT NULL AND v_saida_5 IS NOT NULL THEN
    v_total_minutos := v_total_minutos + EXTRACT(EPOCH FROM (v_saida_5::time - v_entrada_5::time))::INTEGER / 60;
  END IF;
  IF v_entrada_6 IS NOT NULL AND v_saida_6 IS NOT NULL THEN
    v_total_minutos := v_total_minutos + EXTRACT(EPOCH FROM (v_saida_6::time - v_entrada_6::time))::INTEGER / 60;
  END IF;

  v_horas_trab := (v_total_minutos || ' minutes')::INTERVAL;

  -- Buscar jornada do colaborador.
  -- NÃO existe colaboradores.jornada_id neste schema: a carga semanal fica em
  -- colaboradores.jornada_semanal e os horários vêm da jornada ativa da
  -- empresa. A versão anterior referenciava c.jornada_id e por isso QUALQUER
  -- batida falhava. Ordenação determinística evita resultado instável quando a
  -- empresa tem mais de uma jornada ativa.
  SELECT j.horario_entrada,
         j.horario_saida,
         COALESCE(c.jornada_semanal, j.carga_horaria_semanal) AS carga_horaria_semanal
  INTO v_jornada
  FROM public.colaboradores c
  LEFT JOIN LATERAL (
    SELECT jj.horario_entrada, jj.horario_saida, jj.carga_horaria_semanal
    FROM public.jornadas jj
    WHERE jj.empresa_id = c.empresa_id
      AND jj.ativa
    ORDER BY (jj.carga_horaria_semanal = c.jornada_semanal) DESC NULLS LAST,
             jj.created_at ASC,
             jj.id ASC
    LIMIT 1
  ) j ON TRUE
  WHERE c.id = NEW.colaborador_id;

  IF v_jornada.carga_horaria_semanal IS NOT NULL THEN
    v_jornada_minutos := (v_jornada.carga_horaria_semanal * 60) / 5;

    -- Calcular atraso (tolerância de 10 min)
    IF v_entrada_1 IS NOT NULL AND v_jornada.horario_entrada IS NOT NULL THEN
      v_atraso_minutos := GREATEST(0,
        EXTRACT(EPOCH FROM (v_entrada_1::time - v_jornada.horario_entrada::time))::INTEGER / 60 - 10
      );
    END IF;

    -- Calcular saída antecipada
    IF v_jornada.horario_saida IS NOT NULL THEN
      DECLARE v_ultima_saida TEXT;
      BEGIN
        v_ultima_saida := COALESCE(v_saida_6, v_saida_5, v_saida_4, v_saida_3, v_saida_2, v_saida_1);
        IF v_ultima_saida IS NOT NULL THEN
          v_saida_antecipada := GREATEST(0,
            EXTRACT(EPOCH FROM (v_jornada.horario_saida::time - v_ultima_saida::time))::INTEGER / 60
          );
        END IF;
      END;
    END IF;

    IF v_total_minutos > v_jornada_minutos THEN
      v_extras_minutos := v_total_minutos - v_jornada_minutos;
    ELSE
      v_falta_minutos := v_jornada_minutos - v_total_minutos;
    END IF;
  END IF;

  v_horas_ext := (v_extras_minutos || ' minutes')::INTERVAL;
  v_horas_fal := (v_falta_minutos || ' minutes')::INTERVAL;

  INSERT INTO public.registros_ponto (
    colaborador_id, empresa_id, data,
    entrada_1, saida_1, entrada_2, saida_2, entrada_3, saida_3,
    entrada_4, saida_4, entrada_5, saida_5, entrada_6, saida_6,
    saida_intervalo, retorno_intervalo,
    horas_trabalhadas, horas_extras, horas_falta,
    atraso_minutos, saida_antecipada_minutos, total_batidas,
    entrada_esperada, saida_esperada, tipo_dia
  ) VALUES (
    NEW.colaborador_id, NEW.empresa_id, NEW.data,
    v_entrada_1, v_saida_1, v_entrada_2, v_saida_2, v_entrada_3, v_saida_3,
    v_entrada_4, v_saida_4, v_entrada_5, v_saida_5, v_entrada_6, v_saida_6,
    v_saida_1, v_entrada_2,
    v_horas_trab, v_horas_ext, v_horas_fal,
    v_atraso_minutos, v_saida_antecipada, v_total_batidas,
    v_jornada.horario_entrada, v_jornada.horario_saida, 'normal'
  )
  ON CONFLICT (colaborador_id, data)
  DO UPDATE SET
    entrada_1 = EXCLUDED.entrada_1, saida_1 = EXCLUDED.saida_1,
    entrada_2 = EXCLUDED.entrada_2, saida_2 = EXCLUDED.saida_2,
    entrada_3 = EXCLUDED.entrada_3, saida_3 = EXCLUDED.saida_3,
    entrada_4 = EXCLUDED.entrada_4, saida_4 = EXCLUDED.saida_4,
    entrada_5 = EXCLUDED.entrada_5, saida_5 = EXCLUDED.saida_5,
    entrada_6 = EXCLUDED.entrada_6, saida_6 = EXCLUDED.saida_6,
    saida_intervalo = EXCLUDED.saida_intervalo,
    retorno_intervalo = EXCLUDED.retorno_intervalo,
    horas_trabalhadas = EXCLUDED.horas_trabalhadas,
    horas_extras = EXCLUDED.horas_extras,
    horas_falta = EXCLUDED.horas_falta,
    atraso_minutos = EXCLUDED.atraso_minutos,
    saida_antecipada_minutos = EXCLUDED.saida_antecipada_minutos,
    total_batidas = EXCLUDED.total_batidas,
    entrada_esperada = EXCLUDED.entrada_esperada,
    saida_esperada = EXCLUDED.saida_esperada,
    updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A consolidação é um resumo derivado. Uma falha aqui NUNCA pode impedir o
  -- registro da batida, que é o documento com valor legal (Portaria 671).
  INSERT INTO public.logs_sistema (nivel, mensagem, contexto)
  VALUES ('error',
          'Falha ao consolidar espelho do dia; batida preservada',
          jsonb_build_object(
            'origem', 'fn_consolidar_batidas',
            'colaborador_id', NEW.colaborador_id,
            'data', NEW.data,
            'erro', SQLERRM,
            'sqlstate', SQLSTATE));
  RETURN NEW;
END;
$function$;